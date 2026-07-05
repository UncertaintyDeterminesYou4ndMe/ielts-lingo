import type { NextConfig } from "next";
import { config } from "dotenv";
import path from "node:path";

// Electron 打包后，配置需要放在用户数据目录，避免随应用更新被覆盖。
// 开发时默认读取项目根目录的 .env。
const envPath = process.env.DOTENV_PATH || path.join(/*turbopackIgnore: true*/ process.cwd(), ".env");

// 强制以项目内 .env 为准（override:true）。
// 否则 shell 全局导出的同名变量（如 ~/.zshrc 里的旧 DEEPSEEK_API_KEY）会静默覆盖 .env，
// 且换台电脑（如 Windows）行为不一致——项目自带的 .env 应当是唯一事实来源。
config({ path: envPath, override: true });

const nextConfig: NextConfig = {
  // 把原生 / 重型模块声明为外部依赖，不打进 server bundle（原生 .node 本就无法内联）。
  // 注意：Turbopack 仍会用 .next/node_modules 下的别名符号链接来解析它们，
  // 该目录在 Electron 打包时会被丢弃，需由 electron/after-pack.js 补回（见其注释）。
  serverExternalPackages: ["better-sqlite3", "@huggingface/transformers"],
};

export default nextConfig;
