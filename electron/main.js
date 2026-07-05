/* eslint-disable @typescript-eslint/no-require-imports */
const { app, BrowserWindow, dialog } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const { spawn } = require("node:child_process");

const isDev = !app.isPackaged;
const SERVER_PORT = 3000;
const SERVER_URL = `http://localhost:${SERVER_PORT}`;

const devServerUrl = process.env.ELECTRON_DEV_SERVER_URL || null;

let mainWindow = null;
let serverProcess = null;

function log(...args) {
  console.log("[IELTS Lingo]", ...args);
}

function getAppRoot() {
  // 开发时：项目根目录；打包后：resources/app 目录
  return isDev ? path.join(__dirname, "..") : path.join(process.resourcesPath, "app");
}

function initEnvFile() {
  const userData = app.getPath("userData");
  const userEnvPath = path.join(userData, ".env");
  const bundledEnvPath = path.join(getAppRoot(), ".env.example");

  if (!fs.existsSync(userEnvPath) && fs.existsSync(bundledEnvPath)) {
    log("首次运行，复制默认配置到用户目录...");
    fs.copyFileSync(bundledEnvPath, userEnvPath);
  }

  process.env.DOTENV_PATH = userEnvPath;
  log("配置文件路径:", userEnvPath);
}

function initUserData() {
  initEnvFile();

  const userData = app.getPath("userData");
  const userDataDir = path.join(userData, "data");
  fs.mkdirSync(userDataDir, { recursive: true });

  const userDbPath = path.join(userDataDir, "app.db");
  const bundledDbPath = path.join(getAppRoot(), "data", "app.db");

  if (!fs.existsSync(userDbPath) && fs.existsSync(bundledDbPath)) {
    log("首次运行，复制内置词库到用户目录...");
    fs.copyFileSync(bundledDbPath, userDbPath);
  }

  process.env.DATABASE_PATH = userDbPath;
  log("数据库路径:", userDbPath);
}

function initFfmpeg() {
  const platform = process.platform;
  const binaryName = platform === "win32" ? "ffmpeg.exe" : "ffmpeg";
  const bundledFfmpeg = path.join(process.resourcesPath, "ffmpeg", binaryName);

  if (fs.existsSync(bundledFfmpeg)) {
    process.env.FFMPEG_PATH = bundledFfmpeg;
    log("使用内置 ffmpeg:", bundledFfmpeg);
  } else if (!isDev) {
    log("警告：未找到内置 ffmpeg，口语模块可能无法使用");
  }
}

function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tryConnect = () => {
      fetch(url)
        .then(() => resolve())
        .catch(() => {
          if (Date.now() - start > timeoutMs) {
            reject(new Error("等待服务启动超时"));
            return;
          }
          setTimeout(tryConnect, 300);
        });
    };
    tryConnect();
  });
}

function startNextServer() {
  const appRoot = getAppRoot();
  // 直接用 Electron 自带的 Node 运行 next 的 JS 入口，而不是 .bin/next。
  // .bin/next 依赖目标机器安装了系统 node（学生的干净电脑没有），且它是符号链接，
  // 在部分打包场景下不可靠。用 process.execPath + ELECTRON_RUN_AS_NODE 完全自包含。
  const nextEntry = path.join(appRoot, "node_modules", "next", "dist", "bin", "next");

  log("启动 Next.js 服务，工作目录:", appRoot);

  serverProcess = spawn(process.execPath, [nextEntry, "start", "-p", String(SERVER_PORT)], {
    cwd: appRoot,
    env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
    stdio: "pipe",
  });

  serverProcess.stdout.on("data", (data) => {
    process.stdout.write(data);
  });

  serverProcess.stderr.on("data", (data) => {
    process.stderr.write(data);
  });

  serverProcess.on("error", (err) => {
    log("启动 Next.js 服务失败:", err.message);
  });

  serverProcess.on("exit", (code) => {
    log("Next.js 服务已退出，退出码:", code);
  });

  return waitForServer(SERVER_URL);
}

function createWindow(url) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 640,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: "IELTS Lingo",
    show: false,
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  // 保险：加载完成后也显示一次
  mainWindow.webContents.once("did-finish-load", () => {
    if (mainWindow && !mainWindow.isVisible()) {
      mainWindow.show();
    }
  });

  mainWindow.loadURL(url);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

async function boot() {
  try {
    if (devServerUrl) {
      log("开发模式：连接到", devServerUrl);
      await waitForServer(devServerUrl);
      createWindow(devServerUrl);
    } else {
      initUserData();
      initFfmpeg();
      await startNextServer();
      createWindow(SERVER_URL);
    }
  } catch (err) {
    log("启动失败:", err.message);
    dialog.showErrorBox("IELTS Lingo 启动失败", err.message);
    app.quit();
  }
}

app.whenReady().then(boot);

app.on("window-all-closed", () => {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0 && SERVER_URL) {
    createWindow(SERVER_URL);
  }
});

app.on("before-quit", () => {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
});
