import { contextBridge, ipcRenderer } from 'electron';

// 暴露 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,

  // 获取用户数据目录
  getUserDataPath: () => ipcRenderer.invoke('get-user-data-path'),

  // 写入备份文件
  writeBackupFile: (filename: string, content: string) =>
    ipcRenderer.invoke('write-backup-file', filename, content),

  // 读取备份文件
  readBackupFile: (filename: string) =>
    ipcRenderer.invoke('read-backup-file', filename),

  // 检查备份文件是否存在
  backupFileExists: (filename: string) =>
    ipcRenderer.invoke('backup-file-exists', filename),

  // 获取备份目录路径
  getBackupPath: () => ipcRenderer.invoke('get-backup-path'),
});
