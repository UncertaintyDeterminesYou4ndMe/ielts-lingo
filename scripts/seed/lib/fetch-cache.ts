import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const CACHE_DIR = path.join(process.cwd(), "scripts", "seed", ".cache");

/** 下载 URL 内容并缓存到本地，避免重复跑 seed 时重复下载大文件。 */
export async function fetchCached(url: string, cacheName: string): Promise<Buffer> {
  await mkdir(CACHE_DIR, { recursive: true });
  const cachePath = path.join(CACHE_DIR, cacheName);
  if (existsSync(cachePath)) {
    return readFile(cachePath);
  }
  console.log(`  下载 ${url} ...`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`下载失败 ${url}: ${res.status}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(cachePath, buf);
  return buf;
}
