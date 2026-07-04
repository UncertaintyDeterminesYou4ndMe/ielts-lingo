import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";
import * as schema from "./schema";

// 支持 Electron 打包：通过环境变量把数据库放到用户数据目录，避免随应用更新被覆盖。
// 未设置时保持原来的 cwd/data/app.db，兼容开发环境和 seed 脚本。
const dbPath = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.join(process.cwd(), "data", "app.db");

const dataDir = path.dirname(dbPath);
mkdirSync(dataDir, { recursive: true });

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
