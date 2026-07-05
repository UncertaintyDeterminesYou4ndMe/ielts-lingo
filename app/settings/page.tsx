"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ProviderConfig, ProviderType } from "@/lib/settings";

const PROVIDER_TYPES: { value: ProviderType; label: string }[] = [
  { value: "ollama", label: "Ollama（本地）" },
  { value: "openai", label: "OpenAI 兼容" },
  { value: "deepseek", label: "DeepSeek" },
];

const CAPABILITY_OPTIONS = [
  { key: "light", label: "轻任务（例句/干扰项/听力脚本/阅读短文）" },
  { key: "grading", label: "评分任务（写作/口语评分与追问）" },
  { key: "multimodal", label: "多模态（口语音频辅助评分）" },
];

export default function SettingsPage() {
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<ProviderConfig> | null>(null);
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    loadProviders();
  }, []);

  async function loadProviders() {
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      setProviders(data.providers ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function saveProvider(e: React.FormEvent) {
    e.preventDefault();
    if (!editing?.id || !editing.type || !editing.name || !editing.model) return;

    const payload = {
      id: editing.id,
      type: editing.type,
      name: editing.name,
      baseUrl: editing.baseUrl || undefined,
      apiKey: editing.apiKey || undefined,
      model: editing.model,
      enabled: editing.enabled ?? true,
      isDefault: editing.isDefault ?? false,
      capabilities: editing.capabilities ?? ["light"],
    };

    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.error) {
      setMessage(data.error);
    } else {
      setMessage("已保存");
      setEditing(null);
      await loadProviders();
    }
  }

  async function deleteProvider(id: string) {
    if (!confirm("确定删除这个 provider 吗？")) return;
    const res = await fetch(`/api/settings?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      await loadProviders();
    } else {
      const data = await res.json();
      setMessage(data.error ?? "删除失败");
    }
  }

  async function testProvider(p: ProviderConfig) {
    setMessage("正在测试连接...");
    const res = await fetch("/api/settings/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: p.type,
        baseUrl: p.baseUrl,
        apiKey: p.apiKey,
        model: p.model,
      }),
    });
    const data = await res.json();
    if (data.ok) {
      setMessage(`连接成功，延迟 ${data.latencyMs}ms`);
    } else {
      setMessage(`连接失败：${data.error}`);
    }
  }

  function startEdit(p?: ProviderConfig) {
    setEditing(
      p
        ? { ...p }
        : {
            id: "",
            type: "ollama",
            name: "",
            baseUrl: "",
            apiKey: "",
            model: "",
            enabled: true,
            isDefault: false,
            capabilities: ["light"],
          }
    );
    setMessage("");
  }

  function toggleCapability(cap: string) {
    if (!editing) return;
    const caps = new Set(editing.capabilities ?? []);
    if (caps.has(cap)) caps.delete(cap);
    else caps.add(cap);
    setEditing({ ...editing, capabilities: Array.from(caps) });
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-4xl p-8">
        <p className="text-zinc-500">加载中...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl p-8">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm text-zinc-500 hover:underline">
          ← 返回首页
        </Link>
      </div>
      <h1 className="mt-2 text-2xl font-semibold">设置</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        管理 LLM provider 与本地多模态模型。未配置时默认使用 .env 中的 Ollama / DeepSeek。
      </p>

      {message && (
        <div className="mt-4 rounded-lg bg-zinc-100 px-4 py-2 text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          {message}
        </div>
      )}

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">LLM Providers</h2>
          <button
            onClick={() => startEdit()}
            className="rounded-full bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
          >
            + 添加 Provider
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {providers.length === 0 && (
            <p className="text-sm text-zinc-500">暂无 provider，点击右上角添加。</p>
          )}
          {providers.map((p) => (
            <div
              key={p.id}
              className="flex items-start justify-between rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{p.name}</span>
                  {p.isDefault && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                      默认
                    </span>
                  )}
                  {!p.enabled && (
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                      已禁用
                    </span>
                  )}
                </div>
                <div className="mt-1 text-sm text-zinc-500">
                  {p.type} · {p.model}
                  {p.baseUrl && ` · ${p.baseUrl}`}
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {p.capabilities.map((c) => (
                    <span
                      key={c}
                      className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => testProvider(p)}
                  className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                >
                  测试
                </button>
                <button
                  onClick={() => startEdit(p)}
                  className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                >
                  编辑
                </button>
                <button
                  onClick={() => deleteProvider(p.id)}
                  className="rounded-lg border border-rose-200 px-3 py-1.5 text-sm text-rose-600 hover:bg-rose-50 dark:border-rose-900 dark:hover:bg-rose-950"
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {editing && (
        <form
          onSubmit={saveProvider}
          className="mt-6 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
        >
          <h3 className="font-medium">{editing.createdAt ? "编辑 Provider" : "新增 Provider"}</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm text-zinc-600 dark:text-zinc-400">ID</label>
              <input
                required
                disabled={!!editing.createdAt}
                value={editing.id}
                onChange={(e) => setEditing({ ...editing, id: e.target.value })}
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900"
                placeholder="ollama-local"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-600 dark:text-zinc-400">类型</label>
              <select
                value={editing.type}
                onChange={(e) => setEditing({ ...editing, type: e.target.value as ProviderType })}
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900"
              >
                {PROVIDER_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-zinc-600 dark:text-zinc-400">名称</label>
              <input
                required
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900"
                placeholder="本地 Ollama"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-600 dark:text-zinc-400">模型</label>
              <input
                required
                value={editing.model}
                onChange={(e) => setEditing({ ...editing, model: e.target.value })}
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900"
                placeholder="qwen3:8b"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm text-zinc-600 dark:text-zinc-400">
                Base URL{editing.type === "ollama" && "（可选）"}
              </label>
              <input
                value={editing.baseUrl ?? ""}
                onChange={(e) => setEditing({ ...editing, baseUrl: e.target.value })}
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900"
                placeholder={editing.type === "ollama" ? "http://localhost:11434" : "https://api.deepseek.com"}
              />
            </div>
            {editing.type !== "ollama" && (
              <div className="sm:col-span-2">
                <label className="block text-sm text-zinc-600 dark:text-zinc-400">API Key</label>
                <input
                  required
                  type="password"
                  value={editing.apiKey ?? ""}
                  onChange={(e) => setEditing({ ...editing, apiKey: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900"
                  placeholder="sk-..."
                />
              </div>
            )}
          </div>

          <div className="mt-4">
            <label className="block text-sm text-zinc-600 dark:text-zinc-400">能力标签</label>
            <div className="mt-2 space-y-2">
              {CAPABILITY_OPTIONS.map((c) => (
                <label key={c.key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={(editing.capabilities ?? []).includes(c.key)}
                    onChange={() => toggleCapability(c.key)}
                    className="rounded border-zinc-300"
                  />
                  {c.label}
                </label>
              ))}
            </div>
          </div>

          <div className="mt-4 flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={editing.isDefault}
                onChange={(e) => setEditing({ ...editing, isDefault: e.target.checked })}
                className="rounded border-zinc-300"
              />
              设为默认 provider
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={editing.enabled}
                onChange={(e) => setEditing({ ...editing, enabled: e.target.checked })}
                className="rounded border-zinc-300"
              />
              启用
            </label>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button
              type="submit"
              className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              保存
            </button>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="rounded-full px-5 py-2 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              取消
            </button>
          </div>
        </form>
      )}

      <OllamaSetupSection />
      <MultimodalSection />
    </main>
  );
}

function usePlatform() {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("win")) return "windows";
  if (ua.includes("mac")) return "macos";
  return "linux";
}

function copyToClipboard(text: string) {
  void navigator.clipboard.writeText(text);
}

function OllamaSetupSection() {
  const platform = usePlatform();
  const [status, setStatus] = useState<"idle" | "checking" | "not-running" | "running">("idle");
  const [models, setModels] = useState<{ name: string }[]>([]);
  const [targetModel, setTargetModel] = useState("qwen3:8b");
  const [host, setHost] = useState("http://localhost:11434");
  const [copied, setCopied] = useState(false);

  async function check() {
    setStatus("checking");
    try {
      const res = await fetch(`/api/ollama/models?host=${encodeURIComponent(host)}`);
      const data = await res.json();
      const list = data.models ?? [];
      setModels(list);
      setStatus(list.length > 0 || res.ok ? "running" : "not-running");
    } catch {
      setStatus("not-running");
      setModels([]);
    }
  }

  const hasModel = models.some((m) => m.name === targetModel);

  const installCommand =
    platform === "windows"
      ? `# 1. 下载安装包并运行\n# https://ollama.com/download/windows\n# 2. 安装完成后，打开 PowerShell 拉取模型\nollama pull ${targetModel}`
      : platform === "macos"
      ? `brew install ollama\nollama pull ${targetModel}\nollama serve`
      : `# 访问 https://ollama.com/download 下载对应 Linux 安装包\nollama pull ${targetModel}\nollama serve`;

  function copyAndNotify(text: string) {
    copyToClipboard(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <section className="mt-8 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">本地 Ollama 状态</h2>
        <button
          onClick={() => void check()}
          disabled={status === "checking"}
          className="rounded-full bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {status === "checking" ? "检测中..." : status === "idle" ? "检测 Ollama" : "重新检测"}
        </button>
      </div>

      <div className="mt-3 flex items-center gap-2 text-sm">
        <span
          className={`inline-block h-2.5 w-2.5 rounded-full ${
            status === "running"
              ? "bg-emerald-500"
              : status === "not-running"
              ? "bg-rose-500"
              : "bg-amber-400"
          }`}
        />
        {status === "running" && (
          <span>
            Ollama 服务正常（{models.length} 个模型）
            {hasModel ? (
              <span className="ml-2 text-emerald-600">已安装 {targetModel}</span>
            ) : (
              <span className="ml-2 text-rose-600">未安装 {targetModel}</span>
            )}
          </span>
        )}
        {status === "not-running" && <span>未检测到 Ollama 服务</span>}
        {status === "checking" && <span>正在检测...</span>}
        {status === "idle" && <span>点击「检测 Ollama」开始检查</span>}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm text-zinc-600 dark:text-zinc-400">Ollama 地址</label>
          <input
            value={host}
            onChange={(e) => setHost(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900"
            placeholder="http://localhost:11434"
          />
        </div>
        <div>
          <label className="block text-sm text-zinc-600 dark:text-zinc-400">目标模型</label>
          <input
            value={targetModel}
            onChange={(e) => setTargetModel(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900"
            placeholder="qwen3:8b"
          />
        </div>
      </div>

      {status === "not-running" && (
        <div className="mt-4 rounded-lg bg-zinc-50 p-4 text-sm dark:bg-zinc-900">
          <p className="font-medium text-zinc-800 dark:text-zinc-200">
            检测到 {platform === "windows" ? "Windows" : platform === "macos" ? "macOS" : "当前系统"} 尚未运行 Ollama
          </p>
          {platform === "windows" && (
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-zinc-600 dark:text-zinc-400">
              <li>
                下载{" "}
                <a
                  href="https://ollama.com/download/windows"
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-600 hover:underline"
                >
                  OllamaSetup.exe
                </a>{" "}
                并安装。
              </li>
              <li>安装后任务栏右下角会出现羊驼图标，表示服务已运行。</li>
              <li>打开 PowerShell，执行下方命令拉取模型。</li>
            </ol>
          )}
          {platform === "macos" && (
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-zinc-600 dark:text-zinc-400">
              <li>安装 Ollama：<code>brew install ollama</code></li>
              <li>启动服务并拉取模型（见下方命令）。</li>
            </ol>
          )}
          {platform === "linux" && (
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-zinc-600 dark:text-zinc-400">
              <li>访问 Ollama 官网下载对应 Linux 安装包。</li>
              <li>启动服务并拉取模型（见下方命令）。</li>
            </ol>
          )}
        </div>
      )}

      {status === "running" && !hasModel && (
        <div className="mt-4 rounded-lg bg-zinc-50 p-4 text-sm dark:bg-zinc-900">
          <p className="font-medium text-zinc-800 dark:text-zinc-200">
            Ollama 已运行，但缺少模型 {targetModel}
          </p>
          <p className="mt-1 text-zinc-600 dark:text-zinc-400">
            复制下方命令到终端执行，拉取完成后点击「重新检测」。
          </p>
        </div>
      )}

      <div className="mt-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {status === "running" && !hasModel ? "拉取模型命令" : "一键安装脚本"}
          </p>
          <button
            onClick={() => copyAndNotify(installCommand)}
            className="text-xs text-emerald-600 hover:underline"
          >
            {copied ? "已复制" : "复制"}
          </button>
        </div>
        <pre className="mt-2 overflow-x-auto rounded-lg bg-zinc-100 p-3 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          {installCommand}
        </pre>
      </div>

      {models.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">本地已安装模型</p>
          <ul className="mt-2 max-h-40 overflow-auto rounded-lg border border-zinc-200 text-sm dark:border-zinc-800">
            {models.map((m) => (
              <li
                key={m.name}
                className="border-b border-zinc-100 px-3 py-2 last:border-b-0 dark:border-zinc-900"
              >
                {m.name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function MultimodalSection() {
  const [models, setModels] = useState<{ name: string; size: number }[]>([]);
  const [host, setHost] = useState("http://localhost:11434");
  const [targetModel, setTargetModel] = useState("gemma3:4b");
  const [checking, setChecking] = useState(false);
  const [installed, setInstalled] = useState<boolean | null>(null);

  async function refreshModels() {
    setChecking(true);
    try {
      const res = await fetch(`/api/ollama/models?host=${encodeURIComponent(host)}`);
      const data = await res.json();
      setModels(data.models ?? []);
      setInstalled((data.models ?? []).some((m: { name: string }) => m.name === targetModel));
    } finally {
      setChecking(false);
    }
  }

  return (
    <section className="mt-10 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <h2 className="text-lg font-medium">本地多模态模型（可选）</h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        启用后，口语评分可把音频也作为输入，让模型同时参考发音、语调与文本内容。默认 TTS/ASR 链路不受影响。
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm text-zinc-600 dark:text-zinc-400">Ollama 地址</label>
          <input
            value={host}
            onChange={(e) => setHost(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900"
          />
        </div>
        <div>
          <label className="block text-sm text-zinc-600 dark:text-zinc-400">模型名</label>
          <input
            value={targetModel}
            onChange={(e) => setTargetModel(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900"
            placeholder="gemma3:4b"
          />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={refreshModels}
          disabled={checking}
          className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {checking ? "检测中..." : "检测本地模型"}
        </button>
        {installed === true && (
          <span className="text-sm text-emerald-600">已安装 {targetModel}</span>
        )}
        {installed === false && (
          <code className="rounded bg-zinc-100 px-2 py-1 text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            ollama pull {targetModel}
          </code>
        )}
      </div>

      {models.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">本地已安装模型</p>
          <ul className="mt-2 max-h-40 overflow-auto rounded-lg border border-zinc-200 text-sm dark:border-zinc-800">
            {models.map((m) => (
              <li
                key={m.name}
                className="flex items-center justify-between border-b border-zinc-100 px-3 py-2 last:border-b-0 dark:border-zinc-900"
              >
                <span>{m.name}</span>
                <span className="text-xs text-zinc-400">{(m.size / 1024 / 1024 / 1024).toFixed(1)} GB</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
