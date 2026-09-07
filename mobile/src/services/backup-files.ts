import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

function downloadOnWeb(filename: string, contents: string, mimeType: string) {
  const blob = new Blob([contents], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function shareTextFile(filename: string, contents: string, mimeType: string): Promise<void> {
  if (Platform.OS === 'web') {
    downloadOnWeb(filename, contents, mimeType);
    return;
  }
  const file = new File(Paths.cache, filename);
  if (file.exists) file.delete();
  file.create();
  file.write(contents);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: filename, UTI: mimeType === 'text/csv' ? 'public.comma-separated-values-text' : 'public.json' });
    return;
  }
  throw new Error('这台设备暂不支持分享文件。');
}

export async function pickTextFile(): Promise<{ name: string; contents: string } | null> {
  if (Platform.OS === 'web') {
    return pickOnWeb();
  }
  const picked = await File.pickFileAsync({ mimeTypes: ['application/json', 'text/plain', '*/*'] });
  if (picked.canceled || !picked.result) return null;
  return { name: picked.result.name || 'backup.json', contents: await picked.result.text() };
}

function pickOnWeb(): Promise<{ name: string; contents: string } | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json,text/plain';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      file.text().then((contents) => resolve({ name: file.name, contents })).catch(() => resolve(null));
    };
    input.click();
  });
}
