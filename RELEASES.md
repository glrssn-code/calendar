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
    │   └── ...
    └── win/           # Windows EXE 版本
        ├── Calendar.exe           # 便携版可执行文件
        └── Calendar-{version}-win-x64.zip  # 便携版压缩包
```

## 发布流程

1. 修改 `package.json` 中的版本号
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
   start /b npx serve . -p 3000
   timeout /t 2 /nobreak >nul
   start http://localhost:3000
   ```
6. 压缩 win-unpacked 为 zip
7. 提交所有更改到 git

## 注意事项

- `releases/` 目录整体被 gitignore，不会被提交到仓库
- 每个版本独立存放，便于历史版本管理
- HTML 版本可直接部署到任意静态托管服务