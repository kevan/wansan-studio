import { ipcMain, safeStorage } from 'electron';
import Store from 'electron-store';

const store = new Store({ name: 'secure-config' });

export function setupSecureStorageHandlers() {
  ipcMain.handle('secure-set', async (_, key: string, value: string) => {
    if (safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(value);
      store.set(key, encrypted.toString('base64'));
      return true;
    }
    // Fallback or error if encryption not available?
    // For now, if not available, we might just store it plain or fail.
    // Let's try to store plain if encryption fails but warn?
    // Actually, user requirement says "Move API Key storage... to OS-encrypted safeStorage".
    // If not available, we return false.
    return false;
  });

  ipcMain.handle('secure-get', async (_, key: string) => {
    if (safeStorage.isEncryptionAvailable()) {
      const encryptedBase64 = store.get(key) as string;
      if (!encryptedBase64) return null;
      try {
        const buffer = Buffer.from(encryptedBase64, 'base64');
        return safeStorage.decryptString(buffer);
      } catch (e) {
        console.error('Decryption failed:', e);
        return null;
      }
    }
    return null;
  });
}
