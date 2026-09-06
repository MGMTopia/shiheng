module.exports = ({ config }) => {
  const projectId = process.env.EAS_PROJECT_ID || config.extra?.eas?.projectId;
  const channel = process.env.EAS_UPDATE_CHANNEL || config.extra?.releaseChannel || 'preview';
  const updates = {
    enabled: Boolean(projectId),
    checkAutomatically: 'ON_LOAD',
    fallbackToCacheTimeout: 0,
  };

  if (projectId) {
    updates.url = `https://u.expo.dev/${projectId}`;
    updates.requestHeaders = { 'expo-channel-name': channel };
  }

  return {
    ...config,
    updates,
    extra: {
      ...config.extra,
      releaseChannel: channel,
      ...(projectId ? { eas: { ...(config.extra?.eas || {}), projectId } } : {}),
    },
  };
};
