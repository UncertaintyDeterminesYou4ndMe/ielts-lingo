/* eslint-disable @typescript-eslint/no-require-imports */
const { app, BrowserWindow } = require("electron");
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
  const nextBin = path.join(appRoot, "node_modules", ".bin", process.platform === "win32" ? "next.cmd" : "next");

  log("启动 Next.js 服务，工作目录:", appRoot);

  serverProcess = spawn(nextBin, ["start", "-p", String(SERVER_PORT)], {
    cwd: appRoot,
    env: { ...process.env },
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

  mainWindow.loadURL(url);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

async function boot() {
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
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on("before-quit", () => {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
});
