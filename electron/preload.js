"use strict";

// electron/preload.ts
var import_electron = require("electron");
import_electron.contextBridge.exposeInMainWorld("electronAPI", {
  platform: process.platform,
  // 获取用户数据目录
  getUserDataPath: () => import_electron.ipcRenderer.invoke("get-user-data-path"),
  // 写入备份文件
  writeBackupFile: (filename, content) => import_electron.ipcRenderer.invoke("write-backup-file", filename, content),
  // 读取备份文件
  readBackupFile: (filename) => import_electron.ipcRenderer.invoke("read-backup-file", filename),
  // 检查备份文件是否存在
  backupFileExists: (filename) => import_electron.ipcRenderer.invoke("backup-file-exists", filename),
  // 获取备份目录路径
  getBackupPath: () => import_electron.ipcRenderer.invoke("get-backup-path")
});
