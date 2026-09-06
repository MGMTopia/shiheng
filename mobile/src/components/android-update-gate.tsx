import { useEffect } from 'react';
import * as Updates from 'expo-updates';
import { androidUpdatesEnabled } from '@/services/android-updates';

/**
 * Applies a pending EAS Update on Android release builds.
 * Availability is detected by expo-updates (ON_LOAD); this gate does not poll on foreground.
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

  return null;
}
