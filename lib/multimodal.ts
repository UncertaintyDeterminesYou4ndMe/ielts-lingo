// 本地多模态模型封装（通过 Ollama）。
// 注意：Ollama 对音频输入的支持取决于具体模型和 Ollama 版本，失败时自动回退到文本评分。

import { readFile } from "node:fs/promises";
import { getProviders } from "./settings";
import { LLMUnavailableError } from "./llm";

export interface MultimodalOptions {
  system?: string;
  temperature?: number;
}

/** 检查是否启用了可用于指定任务的多模态 provider。 */
export async function isMultimodalEnabled(): Promise<boolean> {
  const all = await getProviders();
  return all.some(
    (p) =>
      p.enabled &&
      p.type === "ollama" &&
      p.capabilities.includes("multimodal") &&
      p.capabilities.includes("grading")
  );
}

/** 把音频文件读成 base64 data URL。 */
async function audioToDataURL(path: string): Promise<string> {
  const buf = await readFile(path);
  return `data:audio/webm;base64,${buf.toString("base64")}`;
}

/** 用多模态模型完成一次带音频输入的评分/分析。 */
export async function completeMultimodal(
  model: string,
  host: string,
  textPrompt: string,
  audioPaths: string[],
  opts: MultimodalOptions = {}
): Promise<string> {
  const url = `${host.replace(/\/$/, "")}/api/chat`;

  const audioBase64s: string[] = [];
  for (const path of audioPaths) {
    try {
      audioBase64s.push(await audioToDataURL(path));
    } catch {
      // 忽略读失败的音频
    }
  }

  const messages: {
    role: string;
    content: string;
    images?: string[];
  }[] = [];

  if (opts.system) {
    messages.push({ role: "system", content: opts.system });
  }

  messages.push({
    role: "user",
    content: `${textPrompt}\n\n[附：考生音频片段 ${audioBase64s.length} 段，供参考发音、语调与流利度]`,
    // Ollama 部分模型支持 images 字段传入 base64；音频输入目前实验性，若服务端不支持会自动忽略。
    images: audioBase64s.length > 0 ? audioBase64s : undefined,
  });

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        options: { temperature: opts.temperature ?? 0 },
      }),
      signal: AbortSignal.timeout(120_000),
    });
  } catch (err) {
    throw new LLMUnavailableError(
      `多模态模型请求失败：${err instanceof Error ? err.message : String(err)}`
    );
  }

  if (!res.ok) {
    const text = await res.text();
    throw new LLMUnavailableError(`多模态模型错误：${res.status} ${text}`);
  }

  const data = (await res.json()) as {
    message?: { content?: string };
  };
  return data.message?.content ?? "";
}

/** 挑选当前启用的多模态 provider。 */
export async function resolveMultimodalProvider() {
  const all = await getProviders();
  return all.find(
    (p) =>
      p.enabled &&
      p.type === "ollama" &&
      p.capabilities.includes("multimodal") &&
      p.capabilities.includes("grading")
  );
}
