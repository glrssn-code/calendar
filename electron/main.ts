import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import http from 'http';
import url from 'url';

const isDev = !app.isPackaged;

let mainWindow: BrowserWindow | null = null;
let server: http.Server | null = null;
let autoBackupTimer: NodeJS.Timeout | null = null;

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain',
};

// 获取备份目录
function getBackupDir(): string {
  const userDataPath = app.getPath('userData');
  const backupDir = path.join(userDataPath, 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  return backupDir;
}

// 注册 IPC 处理器
ipcMain.handle('get-user-data-path', () => {
  return app.getPath('userData');
});

ipcMain.handle('write-backup-file', async (_event, filename: string, content: string) => {
  try {
    const backupDir = getBackupDir();
    const filePath = path.join(backupDir, filename);
    fs.writeFileSync(filePath, content, 'utf-8');
    return { success: true, path: filePath };
  } catch (error) {
    console.error('Failed to write backup file:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('read-backup-file', async (_event, filename: string) => {
  try {
    const backupDir = getBackupDir();
    const filePath = path.join(backupDir, filename);
    if (!fs.existsSync(filePath)) {
      return { success: false, error: 'File not found' };
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return { success: true, content };
  } catch (error) {
    console.error('Failed to read backup file:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('backup-file-exists', async (_event, filename: string) => {
  const backupDir = getBackupDir();
  const filePath = path.join(backupDir, filename);
  return fs.existsSync(filePath);
});

ipcMain.handle('get-backup-path', () => {
  return getBackupDir();
});

// 获取 save/auto 目录路径
function getSaveAutoDir(): string {
  // save/auto 在 exe 同级的 save/auto 目录
  // exe 在 dist-electron/win-unpacked/Calendar.exe
  // __dirname 是 dist-electron/win-unpacked/resources/app/electron/
  const exeDir = path.join(__dirname, '../..');
  const saveAutoDir = path.join(exeDir, 'save', 'auto');
  if (!fs.existsSync(saveAutoDir)) {
    fs.mkdirSync(saveAutoDir, { recursive: true });
  }
  return saveAutoDir;
}

// 手动备份到 save/auto 文件夹
ipcMain.handle('manual-backup-to-save', async (_event, content: string) => {
  try {
    const saveAutoDir = getSaveAutoDir();
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
    const filename = `calendar-backup-${dateStr}-${timeStr}.json`;
    const filePath = path.join(saveAutoDir, filename);
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log('[Backup] Saved to:', filePath);
    return { success: true, path: filePath };
  } catch (error) {
    console.error('[Backup] Failed to save backup:', error);
    return { success: false, error: String(error) };
  }
});

// 设置每日自动备份（由渲染进程触发）
ipcMain.handle('setup-daily-auto-backup', () => {
  if (autoBackupTimer) {
    clearInterval(autoBackupTimer);
  }

  // 每天检查一次（实际上每天固定时间执行）
  // 使用 24 小时 interval，每次检查是否到了执行时间
  const runDailyBackup = () => {
    const now = new Date();
    const saveAutoDir = getSaveAutoDir();
    const dateStr = now.toISOString().split('T')[0];
    const filename = `calendar-backup-${dateStr}.json`;
    const filePath = path.join(saveAutoDir, filename);

    // 检查是否已经备份过今天
    if (!fs.existsSync(filePath)) {
      // 发送请求到渲染进程获取备份数据（通过 IPC）
      // 但这里我们只是记录，实际备份由渲染进程触发
      console.log('[DailyBackup] Time to backup, waiting for renderer...');
    }
  };

  // 立即执行一次
  runDailyBackup();

  // 设置定时器：每小时检查一次
  autoBackupTimer = setInterval(runDailyBackup, 60 * 60 * 1000); // 每小时

  console.log('[DailyBackup] Timer started');
  return { success: true };
});

function serveStatic(dir: string, port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    server = http.createServer((req, res) => {
      const parsedUrl = url.parse(req.url!, true);
      let pathname = parsedUrl.pathname!;

      // 处理根路径
      if (pathname === '/') {
        pathname = '/index.html';
      }

      // 安全处理路径
      let filePath = path.join(dir, pathname);

      // 防止路径穿越
      if (!filePath.startsWith(dir)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      fs.readFile(filePath, (err, content) => {
        if (err) {
          if (err.code === 'ENOENT') {
            // 文件不存在，返回 index.html（用于 SPA 路由）
            const indexPath = path.join(dir, '/index.html');
            fs.readFile(indexPath, (err2, indexContent) => {
              if (err2) {
                res.writeHead(404);
                res.end('Not found');
              } else {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(indexContent);
              }
            });
          } else {
            res.writeHead(500);
            res.end('Server error');
          }
          return;
        }

        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      });
    });

    server.on('error', (err) => {
      console.error('Server error:', err);
      reject(err);
    });

    server.listen(port, '127.0.0.1', () => {
      console.log(`Server running at http://127.0.0.1:${port}`);
      resolve();
    });
  });
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    // 生产模式：启动静态文件服务器
    const outDir = path.join(__dirname, '../out');
    await serveStatic(outDir, 3000);
    mainWindow.loadURL('http://127.0.0.1:3000');
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (server) server.close();
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
