const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  globalIgnores([
    'dist/*',
    '.expo/*',
    'android/*',
    'ios/*',
    'src/data/generated/*',
    'assets/catalog/*',
  ]),
  expoConfig,
]);
