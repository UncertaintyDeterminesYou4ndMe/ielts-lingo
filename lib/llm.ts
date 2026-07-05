// 统一模型适配层：按任务路由到已配置的 provider。
// 换模型/换 provider 只改配置（settings/providers 表或 .env），不动业务代码。

import { resolveProviderForTask, getProviders, type ProviderConfig } from "./settings";

export type LLMTask =
  | "distractor" // 词汇干扰项生成
  | "example" // 例句生成
  | "listening_script" // 听力脚本生成
  | "reading_passage" // 阅读短文生成
  | "essay_grading" // 写作四维评分
  | "speaking_grading" // 口语四维评分
  | "speaking_reply"; // 口语陪练考官追问

const GRADING_TASKS: ReadonlySet<LLMTask> = new Set([
  "essay_grading",
  "speaking_grading",
  "speaking_reply",
]);

export interface CompleteOptions {
  system?: string;
  temperature?: number;
}

export class LLMUnavailableError extends Error {}

async function completeWithOllama(
  provider: ProviderConfig,
  prompt: string,
  opts: CompleteOptions
): Promise<string> {
  const host = provider.baseUrl ?? "http://localhost:11434";
  const model = provider.model;

  let res: Response;
  try {
    res = await fetch(`${host}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt: opts.system ? `${opts.system}\n\n${prompt}` : prompt,
        stream: false,
        options: { temperature: opts.temperature ?? 0.7 },
      }),
    });
  } catch {
    throw new LLMUnavailableError(
      `无法连接 Ollama provider「${provider.name}」（${host}）。请确认已执行 \`ollama serve\`，且已拉取模型：ollama pull ${model}`
    );
  }
  if (!res.ok) {
    throw new LLMUnavailableError(
      `Ollama provider「${provider.name}」请求失败：${res.status} ${await res.text()}`
    );
  }
  const data = (await res.json()) as { response: string };
  return data.response;
}

async function completeWithOpenAI(
  task: LLMTask,
  provider: ProviderConfig,
  prompt: string,
  opts: CompleteOptions
): Promise<string> {
  const apiKey = provider.apiKey;
  if (!apiKey) {
    throw new LLMUnavailableError(
      `Provider「${provider.name}」未设置 API Key。`
    );
  }
  const baseUrl = (provider.baseUrl ?? "https://api.openai.com").replace(/\/$/, "");
  const model = provider.model;

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: opts.temperature ?? (GRADING_TASKS.has(task) ? 0 : 0.7),
      messages: [
        ...(opts.system ? [{ role: "system", content: opts.system }] : []),
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!res.ok) {
    throw new LLMUnavailableError(
      `Provider「${provider.name}」请求失败：${res.status} ${await res.text()}`
    );
  }
  const data = (await res.json()) as {
    choices: { message: { content: string } }[];
  };
  return data.choices[0].message.content;
}

export async function complete(
  task: LLMTask,
  prompt: string,
  opts: CompleteOptions = {}
): Promise<string> {
  const provider = await resolveProviderForTask(task);
  if (!provider) {
    throw new LLMUnavailableError(
      `没有可用的 LLM provider。请先在「设置」里配置，或在 .env 中设置 OLLAMA_HOST / DEEPSEEK_API_KEY。`
    );
  }

  try {
    switch (provider.type) {
      case "ollama":
        return await completeWithOllama(provider, prompt, opts);
      case "openai":
      case "deepseek":
        return await completeWithOpenAI(task, provider, prompt, opts);
      default:
        throw new LLMUnavailableError(`不支持的 provider 类型：${provider.type}`);
    }
  } catch (err) {
    // 轻任务失败时，若配置了 grading provider，尝试回退，保证没装 Ollama 也能用。
    if (err instanceof LLMUnavailableError && !GRADING_TASKS.has(task)) {
      const fallback = await findFallbackProvider();
      if (fallback) {
        return completeWithOpenAI(task, fallback, prompt, opts);
      }
    }
    throw err;
  }
}

/** 找一个能做评分/重任务的 provider 作为轻任务失败时的回退。 */
async function findFallbackProvider(): Promise<ProviderConfig | undefined> {
  const all = await getProviders();
  return all.find(
    (p) =>
      p.enabled &&
      (p.type === "openai" || p.type === "deepseek") &&
      p.apiKey &&
      p.capabilities.includes("grading")
  );
}

/** 要求模型输出严格 JSON；解析失败时加强提示重试一次。 */
export async function completeJSON<T>(
  task: LLMTask,
  prompt: string,
  opts: CompleteOptions = {}
): Promise<T> {
  const jsonInstruction =
    "\n\n只输出合法 JSON，不要任何解释文字，不要 markdown 代码块包裹。";

  let lastRaw = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const raw = await complete(task, prompt + jsonInstruction, {
      ...opts,
      temperature: attempt === 0 ? opts.temperature ?? 0 : 0,
    });
    lastRaw = raw;
    const cleaned = raw
      .trim()
      .replace(/^```(json)?/i, "")
      .replace(/```$/, "")
      .trim();
    try {
      return JSON.parse(cleaned) as T;
    } catch {
      // 重试一次，重试失败则在下面抛出
    }
  }
  throw new Error(`LLM 未返回合法 JSON：${lastRaw.slice(0, 200)}`);
}
