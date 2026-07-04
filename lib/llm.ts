// 统一模型适配层：按任务路由到本地 Ollama（轻任务）或 DeepSeek API（评分类重任务）。
// 换模型/换 provider 只改这个文件，不动业务代码。

export type LLMTask =
  | "distractor" // 词汇干扰项生成
  | "example" // 例句生成
  | "listening_script" // 听力脚本生成
  | "reading_passage" // 阅读短文生成
  | "essay_grading" // 写作四维评分
  | "speaking_grading" // 口语四维评分
  | "speaking_reply"; // 口语陪练考官追问

const LOCAL_TASKS: ReadonlySet<LLMTask> = new Set([
  "distractor",
  "example",
  "listening_script",
  "reading_passage",
]);

export interface CompleteOptions {
  system?: string;
  temperature?: number;
}

export class LLMUnavailableError extends Error {}

async function completeWithOllama(
  prompt: string,
  opts: CompleteOptions
): Promise<string> {
  const host = process.env.OLLAMA_HOST ?? "http://localhost:11434";
  const model = process.env.OLLAMA_MODEL ?? "qwen3:8b";

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
      `无法连接 Ollama（${host}）。请确认已安装并执行 \`ollama serve\`，且已拉取模型：ollama pull ${model}`
    );
  }
  if (!res.ok) {
    throw new LLMUnavailableError(`Ollama 请求失败：${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { response: string };
  return data.response;
}

async function completeWithDeepSeek(
  prompt: string,
  opts: CompleteOptions
): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new LLMUnavailableError("未设置 DEEPSEEK_API_KEY 环境变量，写作/口语评分需要它。");
  }
  const baseUrl = process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com";
  const model = process.env.DEEPSEEK_MODEL ?? "deepseek-chat";

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: opts.temperature ?? 0,
      messages: [
        ...(opts.system ? [{ role: "system", content: opts.system }] : []),
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!res.ok) {
    throw new LLMUnavailableError(`DeepSeek 请求失败：${res.status} ${await res.text()}`);
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
  if (!LOCAL_TASKS.has(task)) {
    return completeWithDeepSeek(prompt, opts);
  }

  // 本地任务优先走 Ollama（免费）；Ollama 不可用时，若配置了 DeepSeek key 则回退，
  // 保证没装 Ollama 的机器也能开箱即用。
  try {
    return await completeWithOllama(prompt, opts);
  } catch (err) {
    if (err instanceof LLMUnavailableError && process.env.DEEPSEEK_API_KEY) {
      return completeWithDeepSeek(prompt, opts);
    }
    throw err;
  }
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
