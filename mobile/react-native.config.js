const fs = require('fs');
const path = require('path');

function nativeRoot(shortName, packageName) {
  const shortDir = path.join('D:', 'n', shortName);
  if (fs.existsSync(path.join(shortDir, 'package.json'))) return shortDir;
  try {
    return path.dirname(require.resolve(`${packageName}/package.json`));
  } catch {
    return undefined;
  }
}

const worklets = nativeRoot('wk', 'react-native-worklets');
const screens = nativeRoot('sc', 'react-native-screens');

module.exports = {
  dependencies: {
    ...(worklets ? { 'react-native-worklets': { root: worklets } } : {}),
    ...(screens ? { 'react-native-screens': { root: screens } } : {}),
  },
};
