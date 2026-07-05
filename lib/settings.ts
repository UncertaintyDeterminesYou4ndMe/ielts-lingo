// Provider 与通用配置的持久化层。
// 所有配置存在 SQLite，UI 配置优先级高于 .env。

import { eq } from "drizzle-orm";
import { db } from "./db";
import { providers, settings } from "./db/schema";
import type { LLMTask } from "./llm";

export type ProviderType = "ollama" | "openai" | "deepseek";

export interface ProviderConfig {
  id: string;
  type: ProviderType;
  name: string;
  baseUrl?: string | null;
  apiKey?: string | null;
  model: string;
  enabled: boolean;
  isDefault: boolean;
  capabilities: string[];
  createdAt: Date;
}

export interface CreateProviderInput {
  id: string;
  type: ProviderType;
  name: string;
  baseUrl?: string;
  apiKey?: string;
  model: string;
  enabled?: boolean;
  isDefault?: boolean;
  capabilities?: string[];
}

const GRADING_TASKS: ReadonlySet<LLMTask> = new Set([
  "essay_grading",
  "speaking_grading",
  "speaking_reply",
]);

function taskCapability(task: LLMTask): "light" | "grading" {
  return GRADING_TASKS.has(task) ? "grading" : "light";
}

/** 读取任意配置项。 */
export async function getSetting<T>(key: string): Promise<T | undefined> {
  const row = await db.query.settings.findFirst({
    where: eq(settings.key, key),
  });
  return row?.value as T | undefined;
}

/** 写入任意配置项。 */
export async function setSetting<T>(key: string, value: T): Promise<void> {
  await db
    .insert(settings)
    .values({ key, value: value as unknown })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: value as unknown },
    });
}

/** 从环境变量导入默认 provider（仅当 providers 表为空时执行）。 */
async function seedProvidersFromEnv(): Promise<void> {
  const existing = await db.select({ count: providers.id }).from(providers);
  if (existing.length > 0) return;

  const defaults: CreateProviderInput[] = [];

  defaults.push({
    id: "ollama-local",
    type: "ollama",
    name: "本地 Ollama",
    baseUrl: process.env.OLLAMA_HOST ?? "http://localhost:11434",
    model: process.env.OLLAMA_MODEL ?? "qwen3:8b",
    enabled: true,
    isDefault: true,
    capabilities: ["light"],
  });

  if (process.env.DEEPSEEK_API_KEY) {
    defaults.push({
      id: "deepseek",
      type: "deepseek",
      name: "DeepSeek API",
      baseUrl: process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com",
      apiKey: process.env.DEEPSEEK_API_KEY,
      model: process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
      enabled: true,
      isDefault: false,
      capabilities: ["light", "grading"],
    });
  }

  for (const p of defaults) {
    await createProvider(p);
  }
}

/** 读取全部 provider（含从 env 的首次迁移）。 */
export async function getProviders(): Promise<ProviderConfig[]> {
  await seedProvidersFromEnv();
  const rows = await db.select().from(providers).orderBy(providers.createdAt);
  return rows.map(normalizeProvider);
}

/** 读取单个 provider。 */
export async function getProvider(id: string): Promise<ProviderConfig | undefined> {
  await seedProvidersFromEnv();
  const row = await db.query.providers.findFirst({
    where: eq(providers.id, id),
  });
  return row ? normalizeProvider(row) : undefined;
}

/** 创建 provider。 */
export async function createProvider(input: CreateProviderInput): Promise<ProviderConfig> {
  const now = new Date();
  const record = {
    ...input,
    baseUrl: input.baseUrl ?? null,
    apiKey: input.apiKey ?? null,
    enabled: input.enabled ?? true,
    isDefault: input.isDefault ?? false,
    capabilities: input.capabilities ?? [],
    createdAt: now,
  };

  // 确保最多只有一个默认 provider。
  if (record.isDefault) {
    await db.update(providers).set({ isDefault: false }).where(eq(providers.isDefault, true));
  }

  await db.insert(providers).values(record);
  return normalizeProvider(record);
}

/** 更新 provider。 */
export async function updateProvider(
  id: string,
  patch: Partial<CreateProviderInput>
): Promise<ProviderConfig | undefined> {
  const existing = await getProvider(id);
  if (!existing) return undefined;

  if (patch.isDefault) {
    await db.update(providers).set({ isDefault: false }).where(eq(providers.isDefault, true));
  }

  const update: Record<string, unknown> = {
    ...patch,
    capabilities: patch.capabilities ?? existing.capabilities,
  };
  if (patch.baseUrl === undefined) delete update.baseUrl;
  if (patch.apiKey === undefined) delete update.apiKey;
  await db.update(providers).set(update).where(eq(providers.id, id));

  return getProvider(id);
}

/** 删除 provider。 */
export async function deleteProvider(id: string): Promise<boolean> {
  const result = await db.delete(providers).where(eq(providers.id, id)).returning();
  return result.length > 0;
}

/** 为指定任务挑选合适的 provider。 */
export async function resolveProviderForTask(task: LLMTask): Promise<ProviderConfig | undefined> {
  const all = await getProviders();
  const enabled = all.filter((p) => p.enabled);
  if (enabled.length === 0) return undefined;

  const required = taskCapability(task);
  const capable = enabled.filter((p) => p.capabilities.includes(required));

  const candidate = capable.find((p) => p.isDefault) ?? capable[0] ?? enabled.find((p) => p.isDefault) ?? enabled[0];
  return candidate;
}

/** 返回当前默认 provider。 */
export async function getDefaultProvider(): Promise<ProviderConfig | undefined> {
  const all = await getProviders();
  return all.find((p) => p.enabled && p.isDefault) ?? all.find((p) => p.enabled);
}

function normalizeProvider(row: typeof providers.$inferSelect): ProviderConfig {
  return {
    id: row.id,
    type: row.type,
    name: row.name,
    baseUrl: row.baseUrl,
    apiKey: row.apiKey,
    model: row.model,
    enabled: row.enabled,
    isDefault: row.isDefault,
    capabilities: row.capabilities ?? [],
    createdAt: row.createdAt,
  };
}
