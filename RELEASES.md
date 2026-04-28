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

   set SERVER_PORT=3000
   set MAX_WAIT=30

   echo =========================================
   echo        Calendar App Launcher
   echo =========================================
   echo.

   :: Step 1: Check Node.js
   echo [Step 1/4] Checking Node.js...
   where node >nul 2>&1
   if %errorlevel% neq 0 (
       echo.
       echo   [ERROR] Node.js not found!
       echo.
       echo   Please install Node.js first:
       echo   1. Open https://nodejs.org/
       echo   2. Download and install LTS version
       echo   3. Run this script again
       echo.
       pause
       exit /b 1
   )
   echo   [OK] Node.js is installed

   :: Step 2: Check Port
   echo.
   echo [Step 2/4] Checking port...
   netstat -ano | findstr ":%SERVER_PORT% " | findstr LISTENING >nul 2>&1
   if %errorlevel% equ 0 (
       echo   [INFO] Port %SERVER_PORT% busy, using 3001
       set SERVER_PORT=3001
   ) else (
       echo   [OK] Port %SERVER_PORT% available
   )

   :: Step 3: Start Server
   echo.
   echo [Step 3/4] Starting server...
   echo   First run downloads dependencies...
   echo.

   :: Start server in background
   start /b "" cmd /c "npx --yes serve . -p %SERVER_PORT% >nul 2>&1"

   :: Wait for server with dots
   echo   Waiting for server...
   echo.

   set WAITED=0

   :WAIT_LOOP
   set /a WAITED+=1

   :: Check if server responds
   curl -s --connect-timeout 1 "http://localhost:%SERVER_PORT%" >nul 2>&1
   if %errorlevel% equ 0 goto SERVER_READY

   :: Show dots (every 5 seconds)
   if %WAITED%==5 echo   .....
   if %WAITED%==10 echo   ..........
   if %WAITED%==15 echo   .............
   if %WAITED%==20 echo   ..................
   if %WAITED%==25 echo   .....................

   :: Check max wait
   if %WAITED% GEQ %MAX_WAIT% (
       echo.
       echo   [WARN] Server taking long time, trying anyway...
       goto SERVER_READY
   )

   timeout /t 1 /nobreak >nul
   goto WAIT_LOOP

   :SERVER_READY
   echo.
   echo   [OK] Server ready!

   :: Step 4: Open Browser
   echo.
   echo [Step 4/4] Opening browser...
   start http://localhost:%SERVER_PORT%

   echo.
   echo =========================================
   echo   SUCCESS!
   echo =========================================
   echo.
   echo   Server: port %SERVER_PORT% (running in background)
   echo   Browser: auto opened
   echo.
   echo   Window will close in 3 seconds...
   echo =========================================

   timeout /t 3 /nobreak >nul
   exit
   ```
   功能：启动器有4个步骤（带序号显示进度）：
   - Step 1: 检测 Node.js，未安装则提示安装
   - Step 2: 检测端口3000，被占用则自动使用3001
   - Step 3: 后台启动服务器，实时检测服务器就绪状态（每秒检查，最多30秒）
   - Step 4: 打开浏览器，成功后3秒自动关闭窗口
   服务器在后台运行，关闭窗口不会停止服务器。

   **默认只发布 HTML 版本**，除非用户明确要求发布 WIN 和 HTML 版本。
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