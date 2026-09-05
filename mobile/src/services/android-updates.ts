import { Platform } from 'react-native';
import * as Updates from 'expo-updates';

export function androidUpdatesEnabled() {
  return Platform.OS === 'android' && Updates.isEnabled;
}

export type AndroidUpdateAction =
  | { status: 'disabled' }
  | { status: 'up-to-date' }
  | { status: 'reloading' }
  | { status: 'error' };

export async function checkFetchAndReloadAndroidUpdate(): Promise<AndroidUpdateAction> {
  if (!androidUpdatesEnabled()) return { status: 'disabled' };
  try {
    const result = await Updates.checkForUpdateAsync();
    if (!result.isAvailable) return { status: 'up-to-date' };
    await Updates.fetchUpdateAsync();
    await Updates.reloadAsync();
    return { status: 'reloading' };
  } catch {
    return { status: 'error' };
  }
}
