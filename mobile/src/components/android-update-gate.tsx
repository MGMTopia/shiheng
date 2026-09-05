import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import * as Updates from 'expo-updates';
import { androidUpdatesEnabled } from '@/services/android-updates';

/**
 * Android release builds: download a pending EAS Update and apply it without
 * waiting for a second cold start. No-op in Expo Go, web, iOS, and debug.
 */
export function AndroidUpdateGate() {
  const { isUpdateAvailable, isUpdatePending, isDownloading } = Updates.useUpdates();

  useEffect(() => {
    if (!androidUpdatesEnabled() || !isUpdatePending) return;
    Updates.reloadAsync().catch(() => undefined);
  }, [isUpdatePending]);

  useEffect(() => {
    if (!androidUpdatesEnabled() || !isUpdateAvailable || isUpdatePending || isDownloading) return;
    Updates.fetchUpdateAsync().catch(() => undefined);
  }, [isDownloading, isUpdateAvailable, isUpdatePending]);

  useEffect(() => {
    if (Platform.OS !== 'android' || !Updates.isEnabled) return;
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') Updates.checkForUpdateAsync().catch(() => undefined);
    });
    return () => subscription.remove();
  }, []);

  return null;
}
