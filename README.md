# IELTS Lingo

本地自用的雅思学习应用，多邻国式的游戏化外壳（关卡地图 / XP / streak / 间隔重复）+
雅思四项技能内核（词汇 / 写作 / 听力 / 阅读 / 口语）。单用户本地运行，不部署、不联网同步。

完整背景和设计决策见 [`PLAN.md`](./PLAN.md)。本文档只讲怎么跑起来。

## 快速开始

```bash
npm install
npm run seed     # 拉取并落库雅思词库（首次运行，约 1-2 分钟，之后走本地缓存秒开）
npm run dev      # 打开 http://localhost:3000
```

`npm run seed` 会检测数据库里是否已有词库，已存在则跳过（保护你的学习进度）。
需要重新拉取时用 `npm run seed -- --force`（会清空 FSRS 复习进度）。

## Windows 桌面客户端（最推荐给学生）

我们为 Windows 打包了独立的安装程序（`.exe`），学生无需安装 Node.js、ffmpeg 等任何依赖：

1. 到 GitHub Releases 下载最新的 `IELTS-Lingo-Setup-x.x.x.exe`（请把项目 push 到 GitHub 后，打 tag 触发自动构建）
2. 双击安装，按向导完成
3. 从开始菜单或桌面快捷方式打开 `IELTS Lingo`
4. 首次启动会稍慢（应用正在把内置词库复制到用户目录）

### 配置 DeepSeek API Key

写作评分、口语评分、以及 Ollama 未安装时的听力/阅读生成，需要 DeepSeek API key。

首次安装后，编辑用户目录下的配置文件：

```
%APPDATA%\IELTS Lingo\.env
```

填入：

```
DEEPSEEK_API_KEY=sk-xxx
```

保存后重启应用即可。

> 如果不填 DeepSeek key：词汇练习、听力/阅读（需本地安装 Ollama）、TTS 朗读仍可正常使用；写作和口语评分会提示缺少 key。

## 在 Windows（或其他设备）上学习

### 方式 A：Mac 当服务器，其他设备用浏览器访问（推荐）

这是一个 web 应用，服务器默认监听所有网卡。只要 Windows 电脑和 Mac 在同一局域网：

1. Mac 上正常启动：`npm run dev`（日常使用建议 `npm run build && npm start`，更快更稳）
2. Windows 浏览器打开 `http://liujiaxiongdeMacBook-Pro.local:3000`
   （或用 IP，启动日志里的 `Network:` 一行会打出来，如 `http://192.168.10.172:3000`）

为什么推荐这个方式：**学习进度只有一份**（streak、FSRS 复习队列、错题本都存在 Mac 的
`data/app.db` 里），不会两台电脑各学各的；Windows 上零安装；Whisper/TTS/Ollama
都继续在 Mac 上跑。

限制与解法：
- Mac 需要开机且在同一网络。首次启动 macOS 可能弹窗询问是否允许 node 接受网络连接，选允许。
- **口语模块的麦克风在局域网 http 下默认被浏览器禁用**（getUserMedia 要求安全上下文，
  只放行 HTTPS 和 localhost）。解法：在 Windows 的 Chrome/Edge 打开
  `chrome://flags/#unsafely-treat-insecure-origin-as-secure`（Edge 为 `edge://flags/...`），
  把 `http://liujiaxiongdeMacBook-Pro.local:3000` 加进去并重启浏览器。
  词汇/写作/听力/阅读不受影响。
- 不在同一局域网时（比如公司电脑），可以两台机器都装 [Tailscale](https://tailscale.com/)
  组虚拟局域网，访问方式不变。

### 方式 B：把项目拷到 Windows 独立运行

适合 Windows 电脑长期不和 Mac 在一个网络的情况。代价：**两边数据库各自独立，
学习进度会分叉**（streak 和复习队列不同步），建议只把一台机器当"主力"。

#### 简单方式：双击 `start-windows.bat`

项目根目录已包含 `start-windows.bat`，适合想"下载即用"的 Windows 用户：

1. 装 [Node.js 20+](https://nodejs.org/)（必须）
2. （推荐）`winget install ffmpeg`，否则口语模块无法使用
3. 把整个项目文件夹拷过去（`node_modules`、`.next`、`scripts/seed/.cache` 不用拷）
4. 双击 `start-windows.bat`
   - 首次会自动 `npm install`
   - 首次会自动 `npm run seed` 初始化词库
   - 首次会自动 `npm run build`
   - 之后直接启动 `npm run start`
5. 浏览器打开 `http://localhost:3000`

`.env`（含 DeepSeek key）在项目根目录，会一起拷过去，无需重新配置。

#### 手动方式

如果你更习惯命令行：

```bash
npm install
npm run seed     # 首次初始化词库
npm run build
npm run start
```

然后浏览器打开 `http://localhost:3000`。

## 依赖的外部服务

| 用途 | 方案 | 是否需要配置 |
|---|---|---|
| 听力脚本、阅读短文生成 | 本地 Ollama 优先，**没装 Ollama 时自动回退到 DeepSeek** | 二选一即可：装 Ollama（免费）或配好 DeepSeek key |
| 写作评分、口语追问与评分 | DeepSeek API | 需要在 `.env` 填 `DEEPSEEK_API_KEY` |
| 词汇练习（干扰项、例句） | 纯本地逻辑，从词库同难度带抽题 | 不需要任何模型 |
| 听力音频合成 | 微软 Edge TTS（`msedge-tts`，免费，无需 API key） | 不需要，联网即可 |
| 口语语音转写 | 本地 Whisper（`@huggingface/transformers`，纯 JS/WASM 推理） | 不需要装 whisper.cpp，但需要系统装了 `ffmpeg`（解码浏览器录音） |

> **模型路由**：听力/阅读生成属于"轻任务"，代码里优先调用本地 Ollama；
> 若 Ollama 未运行且已配置 `DEEPSEEK_API_KEY`，会自动回退到 DeepSeek，所以只配 DeepSeek
> 也能完整使用全部功能。词汇练习完全不依赖任何模型。

### 配置本地 Ollama

```bash
brew install ollama
ollama pull qwen3:8b
ollama serve
```

复制 `.env.example` 为 `.env`，按需调整 `OLLAMA_HOST` / `OLLAMA_MODEL`。

### 配置 DeepSeek

在 `.env` 里填：

```
DEEPSEEK_API_KEY=sk-xxx
```

DeepSeek key 是当前最省事的配置：填了它，词汇（本地逻辑）+ 写作/口语评分 + 听力/阅读生成
（Ollama 缺席时回退）全部可用，不用再装 Ollama。没填 key 且没装 Ollama 时，需要模型的功能
会显示清晰的中文报错（不会崩页面）。

注意：项目在 `next.config.ts` 里以 `.env` 为准强制覆盖（`dotenv override`），
所以 shell 全局导出的同名变量（比如 `~/.zshrc` 里的旧 `DEEPSEEK_API_KEY`）不会干扰应用，
跨电脑行为一致。但项目外的脚本不经过 next.config，仍会读到 shell 里的值。

### 确认 ffmpeg 已安装（口语模块需要）

```bash
brew install ffmpeg
```

Whisper 模型（`Xenova/whisper-base.en`）首次调用时会自动下载权重到本地缓存，
之后离线可用。

## 从源码打包 Windows 安装程序

项目已配置 [Electron](https://www.electronjs.org/) + [electron-builder](https://www.electron.build/)
和 GitHub Actions 自动构建。

### 本地手动打包

需要 Windows 电脑（用于下载 Windows 版 ffmpeg 并构建 native 模块）：

```bash
# 1. 安装依赖
npm install

# 2. 下载 Windows ffmpeg 到 resources/ffmpeg/ffmpeg.exe
#    可从 https://www.gyan.dev/ffmpeg/builds/ 下载 essentials 版本

# 3. 初始化词库并构建
npm run seed
npm run build

# 4. 打包
npx electron-builder --win --x64
```

输出在 `dist/` 目录下。

> 注意：打包过程中 electron-builder 会把 `better-sqlite3` 等 native 模块重编成 Electron 版本。
> 打包后如果继续在本地开发，需要执行 `npm rebuild better-sqlite3` 恢复 Node 版本。

### 用 GitHub Actions 自动构建（推荐）

1. 把项目 push 到 GitHub
2. 打一个版本 tag：
   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```
3. GitHub Actions 会自动在 Windows 运行器上构建 `.exe` 并上传到 Release
4. 学生到 Release 页面下载安装即可

## 目录速览

- `lib/db/schema.ts` — 全部数据表（Drizzle + SQLite，文件在 `data/app.db`）
- `lib/llm.ts` — 模型适配层，`complete(task, prompt)` 按任务路由到 Ollama 或 DeepSeek
- `lib/fsrs.ts` — 间隔重复算法封装（ts-fsrs / FSRS-6）
- `lib/vocab-engine.ts` — 词汇练习的题目生成（4 种题型）
- `lib/tts.ts` / `lib/asr.ts` — 本地语音合成/转写
- `scripts/seed/` — 词库抓取清洗脚本（kajweb/dict + ECDICT）
- `app/learn`、`app/review` — 词汇学习与复习
- `app/writing` — 写作批改
- `app/listening`、`app/reading` — 听力/阅读（内容 AI 现场生成，非真题）
- `app/speaking` — 口语陪练（Part 1/2/3 全流程）
- `app/stats` — 四项练习的统计总览

## 已知限制

- 约 28% 的词库词条因缺少频率数据被兜底分到中间难度带（Lv.3），词表难度分级不是 100% 精确。
- Unit 标题目前是占位符（"词汇 Lv.X · 第N课"），场景化主题命名（租房/环境/科技…）需要
  接入 Ollama 做分类后生成，目前还没跑这一步。
- 口语的 Pronunciation 评分只是基于文字转写的粗略估计（模型看不到真实发音），
  评分结果里会明确标注这一点仅供参考。
- 听力/阅读素材是 AI 现场生成的模拟题，不是雅思真题（真题有版权，未内置）。
