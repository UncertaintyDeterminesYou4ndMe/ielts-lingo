// Ollama 辅助工具：检测本地模型、生成安装命令。

export interface OllamaModel {
  name: string;
  size: number;
  parameterSize?: string;
}

/** 列出 Ollama 本地已安装的模型。 */
export async function listLocalModels(host: string): Promise<OllamaModel[]> {
  const url = `${host.replace(/\/$/, "")}/api/tags`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      models?: { name: string; size: number; details?: { parameter_size?: string } }[];
    };
    return (data.models ?? []).map((m) => ({
      name: m.name,
      size: m.size,
      parameterSize: m.details?.parameter_size,
    }));
  } catch {
    return [];
  }
}

/** 检查指定模型是否已在本地 Ollama 中存在。 */
export async function checkModelInstalled(host: string, model: string): Promise<boolean> {
  const models = await listLocalModels(host);
  return models.some((m) => m.name === model);
}

/** 生成供用户复制执行的拉取命令。 */
export function formatPullCommand(model: string): string {
  return `ollama pull ${model}`;
}
