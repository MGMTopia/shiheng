/**
 * Local-only closed-trial APK helper. Not used by CI.
 * Does not rewrite node_modules. Signing stays in gitignored credentials/.
 */
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const androidHome = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || path.join(os.homedir(), 'AppData/Local/Android/Sdk');
const javaHome = process.env.JAVA_HOME;
const credentialsDir = path.join(root, 'credentials');
const keystoreName = 'shiheng-upload.keystore';
const keystorePath = path.join(credentialsDir, keystoreName);
const propertiesPath = path.join(credentialsDir, 'keystore.properties');
const releaseDir = path.join(root, 'release');
const apkName = 'shiheng-1.0.0-closed-trial.apk';

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
const androidDir = path.join(root, 'android');
if (process.platform === 'win32') {
  run('gradlew.bat', ['assembleRelease'], androidDir);
} else {
  run('./gradlew', ['assembleRelease'], androidDir);
}
copyApk();
