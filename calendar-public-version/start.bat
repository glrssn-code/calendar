@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ========================================
echo   日历应用 - 网页版
echo ========================================
echo.
echo 正在启动服务器...
start http://localhost:3000
npx serve . -p 3000
