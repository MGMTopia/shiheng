/**
 * Local-only closed-trial APK helper. Not used by CI.
 * On Windows, copies cmake-using native packages to a short drive path
 * (C:\\n or D:\\n) and points Gradle at those dirs so NDK object paths stay
 * under MAX_PATH. Signing stays in gitignored credentials/.
 */
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultAndroidHome = process.platform === 'win32'
  ? path.join(os.homedir(), 'AppData/Local/Android/Sdk')
  : path.join(os.homedir(), 'Android/Sdk');
const androidHome = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || defaultAndroidHome;
const javaHome = process.env.JAVA_HOME;
const credentialsDir = path.join(root, 'credentials');
const keystoreName = 'shiheng-upload.keystore';
const keystorePath = path.join(credentialsDir, keystoreName);
const propertiesPath = path.join(credentialsDir, 'keystore.properties');
const releaseDir = path.join(root, 'release');
const apkName = 'shiheng-1.0.1-closed-trial.apk';

if (!javaHome) {
  throw new Error('Set JAVA_HOME to a JDK 17+ install before building the local APK.');
}

process.env.CI = '1';
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
process.env.ANDROID_HOME = androidHome;
process.env.ANDROID_SDK_ROOT = androidHome;
process.env.PATH = [path.join(androidHome, 'platform-tools'), path.join(javaHome, 'bin'), process.env.PATH].join(path.delimiter);

function run(command, args, cwd = root) {
  console.log(`\n> ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, { cwd, stdio: 'inherit', env: process.env, shell: process.platform === 'win32' });
  if (result.status !== 0) {
    throw new Error(`${command} failed with exit ${result.status}`);
  }
}

function ensureKeystore() {
  fs.mkdirSync(credentialsDir, { recursive: true });
  if (fs.existsSync(keystorePath) && fs.existsSync(propertiesPath)) {
    console.log('Using existing closed-trial upload keystore.');
    return parseProperties(fs.readFileSync(propertiesPath, 'utf8'));
  }

  const password = randomBytes(18).toString('base64url');
  const keytool = path.join(javaHome, 'bin', process.platform === 'win32' ? 'keytool.exe' : 'keytool');
  const result = spawnSync(keytool, [
    '-genkeypair', '-v', '-storetype', 'JKS',
    '-keystore', keystorePath,
    '-alias', 'shiheng',
    '-keyalg', 'RSA', '-keysize', '2048', '-validity', '10000',
    '-storepass', password, '-keypass', password,
    '-dname', 'CN=Shiheng Closed Trial, OU=Closed Trial, O=Shiheng, L=Sydney, ST=NSW, C=AU',
  ], { stdio: 'inherit' });
  if (result.status !== 0) throw new Error('keytool failed to create the upload keystore');

  const properties = {
    MYAPP_UPLOAD_STORE_FILE: keystoreName,
    MYAPP_UPLOAD_KEY_ALIAS: 'shiheng',
    MYAPP_UPLOAD_STORE_PASSWORD: password,
    MYAPP_UPLOAD_KEY_PASSWORD: password,
  };
  fs.writeFileSync(propertiesPath, Object.entries(properties).map(([key, value]) => `${key}=${value}`).join('\n') + '\n');
  console.log(`Wrote ${propertiesPath}. Keep this file private; losing it prevents overwrite installs.`);
  return properties;
}

function parseProperties(raw) {
  return Object.fromEntries(raw.split(/\r?\n/).filter((line) => line.includes('=')).map((line) => {
    const index = line.indexOf('=');
    return [line.slice(0, index), line.slice(index + 1)];
  }));
}

function injectSigning(properties) {
  const androidDir = path.join(root, 'android');
  const appDir = path.join(androidDir, 'app');
  fs.copyFileSync(keystorePath, path.join(appDir, keystoreName));

  const gradlePropertiesPath = path.join(androidDir, 'gradle.properties');
  let gradleProperties = fs.readFileSync(gradlePropertiesPath, 'utf8');
  for (const [key, value] of Object.entries(properties)) {
    const line = `${key}=${value}`;
    if (new RegExp(`^${key}=`, 'm').test(gradleProperties)) {
      gradleProperties = gradleProperties.replace(new RegExp(`^${key}=.*$`, 'm'), line);
    } else {
      gradleProperties += `\n${line}`;
    }
  }
  fs.writeFileSync(gradlePropertiesPath, gradleProperties);

  const buildGradlePath = path.join(appDir, 'build.gradle');
  let buildGradle = fs.readFileSync(buildGradlePath, 'utf8');
  const signingConfigs = `signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            storeFile file(MYAPP_UPLOAD_STORE_FILE)
            storePassword MYAPP_UPLOAD_STORE_PASSWORD
            keyAlias MYAPP_UPLOAD_KEY_ALIAS
            keyPassword MYAPP_UPLOAD_KEY_PASSWORD
        }
    }`;
  if (!/storeFile file\(MYAPP_UPLOAD_STORE_FILE\)/.test(buildGradle)) {
    buildGradle = buildGradle.replace(/signingConfigs\s*\{[\s\S]*?^\s{4}\}/m, signingConfigs);
  }
  buildGradle = buildGradle.replace(/signingConfig signingConfigs\.debug/g, (value, offset, source) => {
    const before = source.slice(0, offset);
    return before.lastIndexOf('release {') > before.lastIndexOf('debug {')
      ? 'signingConfig signingConfigs.release'
      : value;
  });
  fs.writeFileSync(buildGradlePath, buildGradle);
}

function nativeCmakePackageDirs() {
  const nodeModules = path.join(root, 'node_modules');
  const extraNames = new Set(['expo-modules-core', 'react-native-gesture-handler']);
  const dirs = [];
  const seen = new Set();
  const add = (packageDir) => {
    if (!packageDir || !fs.existsSync(packageDir)) return;
    const resolved = fs.realpathSync(packageDir);
    if (seen.has(resolved)) return;
    const name = path.basename(resolved);
    const hasCmake = fs.existsSync(path.join(resolved, 'android', 'CMakeLists.txt'));
    if (!hasCmake && !extraNames.has(name)) return;
    if (!fs.existsSync(path.join(resolved, 'android'))) return;
    seen.add(resolved);
    dirs.push(resolved);
  };
  for (const name of fs.readdirSync(nodeModules).filter((entry) => !entry.startsWith('.'))) {
    add(path.join(nodeModules, name));
  }
  const pnpm = path.join(nodeModules, '.pnpm');
  if (fs.existsSync(pnpm)) {
    for (const storeDir of fs.readdirSync(pnpm)) {
      const nested = path.join(pnpm, storeDir, 'node_modules');
      if (!fs.existsSync(nested)) continue;
      for (const name of fs.readdirSync(nested)) {
        add(path.join(nested, name));
      }
    }
  }
  return dirs;
}

function shortNativeRoot() {
  for (const candidate of ['D:\\n', 'C:\\n']) {
    try {
      fs.mkdirSync(candidate, { recursive: true });
      fs.accessSync(candidate, fs.constants.W_OK);
      return candidate;
    } catch {
      // try the next drive
    }
  }
  throw new Error('Need a writable short path (C:\\n or D:\\n) for the Windows NDK build.');
}

function relocateNativeCmakePackages() {
  const shortRoot = shortNativeRoot();
  const mapping = [];
  for (const packageDir of nativeCmakePackageDirs()) {
    const name = path.basename(packageDir);
    const shortName = {
      'react-native-screens': 's',
      'react-native-worklets': 'w',
      'react-native-reanimated': 'r',
      'expo-sqlite': 'q',
      'expo-updates': 'u',
      'expo-modules-core': 'c',
      'react-native-gesture-handler': 'g',
    }[name] || `p${mapping.length}`;
    const destination = path.join(shortRoot, shortName);
    const real = fs.realpathSync(packageDir);
    console.log(`Copying ${name} to ${destination} for Windows NDK paths`);
    fs.rmSync(destination, { recursive: true, force: true });
    fs.cpSync(real, destination, {
      recursive: true,
      filter: (source) => {
        const rel = path.relative(real, source);
        return !rel.split(path.sep).includes('.cxx')
          && rel !== path.join('android', 'build')
          && !rel.startsWith(`${path.join('android', 'build')}${path.sep}`);
      },
    });
    const cmakeLists = path.join(destination, 'android', 'CMakeLists.txt');
    if (fs.existsSync(cmakeLists)) {
      const contents = fs.readFileSync(cmakeLists, 'utf8').replace(
        /# shiheng-windows-object-path-max\r?\nset\(CMAKE_OBJECT_PATH_MAX 1024 CACHE STRING "" FORCE\)\r?\n/,
        '',
      );
      fs.writeFileSync(cmakeLists, contents);
    }
    mapping.push({
      name,
      androidDir: path.join(destination, 'android').replace(/\\/g, '/'),
      nodeModules: path.dirname(real),
    });
  }

  const settingsPath = path.join(root, 'android', 'settings.gradle');
  let settings = fs.readFileSync(settingsPath, 'utf8');
  const snippet = `
// shiheng-windows-native-dirs
${mapping.map(({ name, androidDir }) => `project(':${name}').projectDir = new File('${androidDir}')`).join('\n')}
`;
  if (settings.includes('shiheng-windows-native-dirs')) {
    settings = settings.replace(/\n\/\/ shiheng-windows-native-dirs[\s\S]*$/, snippet);
  } else {
    settings = `${settings.trimEnd()}\n${snippet}`;
  }
  fs.writeFileSync(settingsPath, settings);
  process.env.NODE_PATH = [
    ...mapping.map((entry) => entry.nodeModules),
    process.env.NODE_PATH,
  ].filter(Boolean).join(path.delimiter);
  return mapping.map((entry) => entry.androidDir);
}

function preferArm64Architecture() {
  const gradlePropertiesPath = path.join(root, 'android', 'gradle.properties');
  let gradleProperties = fs.readFileSync(gradlePropertiesPath, 'utf8');
  gradleProperties = gradleProperties.replace(
    /^reactNativeArchitectures=.*$/m,
    'reactNativeArchitectures=arm64-v8a',
  );
  fs.writeFileSync(gradlePropertiesPath, gradleProperties);
}

function tuneGradleForClosedTrial() {
  const gradlePropertiesPath = path.join(root, 'android', 'gradle.properties');
  let gradleProperties = fs.readFileSync(gradlePropertiesPath, 'utf8');
  const jvmLine = 'org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m -Dfile.encoding=UTF-8';
  if (/^org\.gradle\.jvmargs=/m.test(gradleProperties)) {
    gradleProperties = gradleProperties.replace(/^org\.gradle\.jvmargs=.*$/m, jvmLine);
  } else {
    gradleProperties += `\n${jvmLine}\n`;
  }
  // Vital lint OOMs / hangs on constrained CI agents; release APK still packages fine.
  if (!/^android\.lint\.checkReleaseBuilds=/m.test(gradleProperties)) {
    gradleProperties += '\nandroid.lint.checkReleaseBuilds=false\n';
  }
  fs.writeFileSync(gradlePropertiesPath, gradleProperties);
}

function injectWindowsNativeWorkarounds() {
  // Closed-trial ships arm64 only (matches prior phone installs).
  preferArm64Architecture();
  tuneGradleForClosedTrial();
  // Windows NDK short-path relocation is not needed on Linux/macOS.
  if (process.platform !== 'win32') return [];
  return relocateNativeCmakePackages();
}

function cleanStaleNdkDirs(shortAndroidDirs = []) {
  const candidates = [
    path.join(root, 'android', 'app', '.cxx'),
    ...nativeCmakePackageDirs().map((packageDir) => path.join(packageDir, 'android', '.cxx')),
    ...shortAndroidDirs.map((androidDir) => path.join(androidDir, '.cxx')),
  ];
  for (const dir of candidates) {
    const resolved = fs.existsSync(dir) ? fs.realpathSync(dir) : dir;
    if (fs.existsSync(resolved)) {
      console.log(`Removing stale NDK dir ${resolved}`);
      fs.rmSync(resolved, { recursive: true, force: true });
    }
  }
}

function copyApk() {
  const generated = path.join(root, 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
  if (!fs.existsSync(generated)) throw new Error(`Release APK not found at ${generated}`);
  fs.mkdirSync(releaseDir, { recursive: true });
  const output = path.join(releaseDir, apkName);
  fs.copyFileSync(generated, output);
  const sizeMb = (fs.statSync(output).size / (1024 * 1024)).toFixed(1);
  console.log(`\nClosed-trial APK ready: ${output} (${sizeMb} MB)`);
  console.log('Install: enable unknown sources, then open the APK on the Android phone.');
}

const properties = ensureKeystore();
const skipPrebuild = process.argv.includes('--resume') && fs.existsSync(path.join(root, 'android', 'app', 'build.gradle'));
if (!skipPrebuild) {
  run('npx', ['expo', 'prebuild', '--platform', 'android', '--clean', '--non-interactive', '--no-install']);
}
injectSigning(properties);
const shortAndroidDirs = injectWindowsNativeWorkarounds() || [];
cleanStaleNdkDirs(shortAndroidDirs);
const androidDir = path.join(root, 'android');
const gradleArgs = [
  'assembleRelease',
  '-x', 'lintVitalAnalyzeRelease',
  '-x', 'lintVitalReportRelease',
  '-x', 'lintVitalRelease',
  '--no-daemon',
];
if (process.platform === 'win32') {
  run('gradlew.bat', gradleArgs, androidDir);
} else {
  run('./gradlew', gradleArgs, androidDir);
}
copyApk();
