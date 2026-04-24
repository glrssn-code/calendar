# 发布规范

## 版本目录结构

每个版本发布在 `releases/v{version}/` 目录下：

```
releases/
└── v{version}/
    ├── html/          # HTML 版本（可用于静态部署）
    │   ├── index.html
    │   ├── life.html
    │   ├── settings.html
    │   ├── start.bat  # 启动脚本（启动服务器+打开浏览器）
    │   ├── stop.bat   # 停止服务器脚本
    │   └── 使用前请阅读.txt
    └── win/           # Windows EXE 版本
        ├── win-unpacked/           # 便携版解压目录
        └── Calendar-{version}-win-x64.zip  # 便携版压缩包
```

## 发布流程

1. 修改所有版本号（确保统一）：
   - `package.json` 中的 version
   - `app/settings/page.tsx` 中的版本显示文字
   - `lib/backup.ts` 中的 appVersion
   - `README.md` 中的版本路径
2. 运行 `npm run build` 构建 HTML 版本
3. 运行 `npm run electron:build` 构建 Electron 版本
4. 创建发布目录并复制文件：
   ```bash
   mkdir -p releases/v{version}/html releases/v{version}/win
   cp -r out/* releases/v{version}/html/
   cp dist-electron/win-unpacked/Calendar.exe releases/v{version}/win/
   ```
5. 在 html/ 目录下创建 start.bat：
   ```bat
   @echo off
   cd /d "%~dp0"
   powershell -WindowStyle Hidden -Command "Start-Process cmd -ArgumentList '/c npx --yes serve . -p 3000' -WindowStyle Hidden -PassThru | Out-Null"
   timeout /t 3 /nobreak >nul
   start http://localhost:3000
   exit
   ```
   功能：静默启动服务器（无窗口），等待 3 秒后自动打开浏览器，窗口自动关闭。服务器在后台运行。
6. 在 html/ 目录下创建 stop.bat：
   ```bat
   @echo off
   taskkill /f /im node.exe 2>nul
   echo Server stopped.
   pause
   ```
   功能：关闭所有 node 进程（服务器），显示确认信息。
7. 在 html/ 目录下创建 使用前请阅读.txt（软件简介及使用教程）
8. 压缩 win-unpacked 为 zip
9. 提交所有更改到 git

## 注意事项

- `releases/` 目录整体被 gitignore，不会被提交到仓库
- 每个版本独立存放，便于历史版本管理
- HTML 版本可直接部署到任意静态托管服务