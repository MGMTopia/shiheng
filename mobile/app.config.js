module.exports = ({ config }) => {
  const projectId = process.env.EAS_PROJECT_ID || config.extra?.eas?.projectId;
  const channel = process.env.EAS_UPDATE_CHANNEL || 'production';
  const updates = {
    enabled: true,
    checkAutomatically: 'ON_LOAD',
    fallbackToCacheTimeout: 0,
    ...config.updates,
  };

  if (projectId) {
    updates.url = `https://u.expo.dev/${projectId}`;
    updates.requestHeaders = {
      ...(config.updates?.requestHeaders || {}),
      'expo-channel-name': channel,
    };
  }

  return {
    ...config,
    updates,
    extra: projectId
      ? { ...config.extra, eas: { ...(config.extra?.eas || {}), projectId } }
      : config.extra,
  };
};
