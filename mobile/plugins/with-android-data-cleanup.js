const { AndroidConfig, withAndroidManifest, withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const BACKUP_RULES = `<?xml version="1.0" encoding="utf-8"?>
<full-backup-content>
    <exclude domain="root" />
    <exclude domain="file" />
    <exclude domain="database" />
    <exclude domain="sharedpref" />
    <exclude domain="external" />
</full-backup-content>
`;

const EXTRACTION_RULES = `<?xml version="1.0" encoding="utf-8"?>
<data-extraction-rules>
    <cloud-backup>
        <exclude domain="root" />
        <exclude domain="file" />
        <exclude domain="database" />
        <exclude domain="sharedpref" />
        <exclude domain="external" />
    </cloud-backup>
    <device-transfer>
        <exclude domain="root" />
        <exclude domain="file" />
        <exclude domain="database" />
        <exclude domain="sharedpref" />
        <exclude domain="external" />
    </device-transfer>
</data-extraction-rules>
`;

/**
 * Keeps diet logs, feedback and metrics out of Google backup / D2D transfer
 * so uninstall (and a later reinstall) cannot restore them.
 */
function withAndroidDataCleanup(config) {
  config = withAndroidManifest(config, (mod) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(mod.modResults);
    application.$['android:allowBackup'] = 'false';
    application.$['android:fullBackupContent'] = '@xml/shiheng_backup_rules';
    application.$['android:dataExtractionRules'] = '@xml/shiheng_data_extraction_rules';
    application.$['android:hasFragileUserData'] = 'false';
    return mod;
  });

  config = withDangerousMod(config, [
    'android',
    async (mod) => {
      const xmlDir = path.join(mod.modRequest.platformProjectRoot, 'app/src/main/res/xml');
      await fs.promises.mkdir(xmlDir, { recursive: true });
      await fs.promises.writeFile(path.join(xmlDir, 'shiheng_backup_rules.xml'), BACKUP_RULES);
      await fs.promises.writeFile(path.join(xmlDir, 'shiheng_data_extraction_rules.xml'), EXTRACTION_RULES);
      return mod;
    },
  ]);

  return config;
}

module.exports = withAndroidDataCleanup;
