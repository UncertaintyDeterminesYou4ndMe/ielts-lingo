@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

echo ===========================================
echo   IELTS Lingo - Windows 启动脚本
echo ===========================================
echo.

:: 检查 Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到 Node.js，请先安装 Node.js 20+：
    echo   https://nodejs.org/
    echo.
    pause
    exit /b 1
)

for /f "tokens=1" %%a in ('node --version') do set NODE_VERSION=%%a
echo [OK] 检测到 Node.js %NODE_VERSION%

:: 检查 ffmpeg（口语模块需要）
ffmpeg -version >nul 2>&1
if errorlevel 1 (
    echo [警告] 未检测到 ffmpeg。口语模块会无法使用。
    echo   如需口语功能，请安装 ffmpeg：
    echo     winget install ffmpeg
    echo   或访问 https://ffmpeg.org/download.html
    echo.
    choice /C YN /M "是否继续启动（不带口语功能）"
    if errorlevel 2 exit /b 1
)

:: 安装依赖
if not exist "node_modules" (
    echo.
    echo [1/3] 正在安装依赖，请稍候...
    call npm install
    if errorlevel 1 (
        echo [错误] 依赖安装失败
        pause
        exit /b 1
    )
) else (
    echo [OK] 依赖已安装
)

:: 创建数据目录
if not exist "data" mkdir data

:: 初始化数据库（如果还没有词库）
if not exist "data\app.db" (
    echo.
    echo [2/3] 首次运行，正在初始化词库（约 1-2 分钟）...
    call npm run seed
    if errorlevel 1 (
        echo [错误] 数据库初始化失败
        pause
        exit /b 1
    )
) else (
    echo [OK] 本地数据库已存在 data\app.db
)

:: 构建生产版本（如果还没构建）
if not exist ".next" (
    echo.
    echo [3/3] 首次运行，正在构建生产版本...
    call npm run build
    if errorlevel 1 (
        echo [错误] 构建失败
        pause
        exit /b 1
    )
) else (
    echo [OK] 生产构建已存在
)

echo.
echo ===========================================
echo   启动成功！请在浏览器打开：
echo   http://localhost:3000
echo ===========================================
echo   按 Ctrl+C 停止服务
echo.

npm run start

pause
