"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// electron/main.ts
var import_electron = require("electron");
var import_path = __toESM(require("path"));
var import_fs = __toESM(require("fs"));
var import_http = __toESM(require("http"));
var import_url = __toESM(require("url"));
var isDev = !import_electron.app.isPackaged;
var mainWindow = null;
var server = null;
var MIME_TYPES = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".svg": "image/svg+xml",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".txt": "text/plain"
};
function getBackupDir() {
  const userDataPath = import_electron.app.getPath("userData");
  const backupDir = import_path.default.join(userDataPath, "backups");
  if (!import_fs.default.existsSync(backupDir)) {
    import_fs.default.mkdirSync(backupDir, { recursive: true });
  }
  return backupDir;
}
import_electron.ipcMain.handle("get-user-data-path", () => {
  return import_electron.app.getPath("userData");
});
import_electron.ipcMain.handle("write-backup-file", async (_event, filename, content) => {
  try {
    const backupDir = getBackupDir();
    const filePath = import_path.default.join(backupDir, filename);
    import_fs.default.writeFileSync(filePath, content, "utf-8");
    return { success: true, path: filePath };
  } catch (error) {
    console.error("Failed to write backup file:", error);
    return { success: false, error: String(error) };
  }
});
import_electron.ipcMain.handle("read-backup-file", async (_event, filename) => {
  try {
    const backupDir = getBackupDir();
    const filePath = import_path.default.join(backupDir, filename);
    if (!import_fs.default.existsSync(filePath)) {
      return { success: false, error: "File not found" };
    }
    const content = import_fs.default.readFileSync(filePath, "utf-8");
    return { success: true, content };
  } catch (error) {
    console.error("Failed to read backup file:", error);
    return { success: false, error: String(error) };
  }
});
import_electron.ipcMain.handle("backup-file-exists", async (_event, filename) => {
  const backupDir = getBackupDir();
  const filePath = import_path.default.join(backupDir, filename);
  return import_fs.default.existsSync(filePath);
});
import_electron.ipcMain.handle("get-backup-path", () => {
  return getBackupDir();
});
function serveStatic(dir, port) {
  return new Promise((resolve, reject) => {
    server = import_http.default.createServer((req, res) => {
      const parsedUrl = import_url.default.parse(req.url, true);
      let pathname = parsedUrl.pathname;
      if (pathname === "/") {
        pathname = "/index.html";
      }
      let filePath = import_path.default.join(dir, pathname);
      if (!filePath.startsWith(dir)) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
      }
      const ext = import_path.default.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || "application/octet-stream";
      import_fs.default.readFile(filePath, (err, content) => {
        if (err) {
          if (err.code === "ENOENT") {
            const indexPath = import_path.default.join(dir, "/index.html");
            import_fs.default.readFile(indexPath, (err2, indexContent) => {
              if (err2) {
                res.writeHead(404);
                res.end("Not found");
              } else {
                res.writeHead(200, { "Content-Type": "text/html" });
                res.end(indexContent);
              }
            });
          } else {
            res.writeHead(500);
            res.end("Server error");
          }
          return;
        }
        res.writeHead(200, { "Content-Type": contentType });
        res.end(content);
      });
    });
    server.on("error", (err) => {
      console.error("Server error:", err);
      reject(err);
    });
    server.listen(port, "127.0.0.1", () => {
      console.log(`Server running at http://127.0.0.1:${port}`);
      resolve();
    });
  });
}
async function createWindow() {
  mainWindow = new import_electron.BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: import_path.default.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  if (isDev) {
    mainWindow.loadURL("http://localhost:3000");
    mainWindow.webContents.openDevTools();
  } else {
    const outDir = import_path.default.join(__dirname, "../out");
    await serveStatic(outDir, 3e3);
    mainWindow.loadURL("http://127.0.0.1:3000");
  }
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}
import_electron.app.whenReady().then(createWindow);
import_electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    if (server) server.close();
    import_electron.app.quit();
  }
});
import_electron.app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});
