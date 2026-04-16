export {};

declare global {
  interface Window {
    electronAPI?: {
      platform: string;
      getUserDataPath: () => Promise<string>;
      writeBackupFile: (filename: string, content: string) => Promise<{ success: boolean; path?: string; error?: string }>;
      readBackupFile: (filename: string) => Promise<{ success: boolean; content?: string; error?: string }>;
      backupFileExists: (filename: string) => Promise<boolean>;
      getBackupPath: () => Promise<string>;
      manualBackupToSave: (content: string) => Promise<{ success: boolean; path?: string; error?: string }>;
      setupDailyAutoBackup: () => Promise<{ success: boolean }>;
    };
  }
}
