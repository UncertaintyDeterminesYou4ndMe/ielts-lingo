"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { EssayPrompt } from "@/lib/essay-prompts";
import { gradeEssay } from "./actions";

function draftKey(promptId: string) {
  return `ielts-lingo:draft:${promptId}`;
}

export default function EssayEditor({ prompt }: { prompt: EssayPrompt }) {
  // 组件按 prompt.id 作为 key 挂载（见调用处），换题目时会整体重新挂载，
  // 所以草稿可以直接用惰性初始值从 localStorage 读取，不需要额外的 effect。
  const [body, setBody] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem(draftKey(prompt.id)) ?? "" : ""
  );
  const [secondsLeft, setSecondsLeft] = useState(prompt.timeLimitMin * 60);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      localStorage.setItem(draftKey(prompt.id), body);
    }, 500);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [body, prompt.id]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const wordCount = useMemo(
    () => body.trim().split(/\s+/).filter(Boolean).length,
    [body]
  );

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeUp = secondsLeft === 0;

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        const { id } = await gradeEssay({ promptId: prompt.id, body });
        localStorage.removeItem(draftKey(prompt.id));
        router.push(`/writing/essays/${id}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "评分失败，请稍后重试");
      }
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{prompt.title}</h1>
        <span className={`font-mono text-lg ${timeUp ? "text-rose-600" : "text-zinc-600 dark:text-zinc-400"}`}>
          {minutes}:{seconds.toString().padStart(2, "0")}
        </span>
      </div>

      <p className="mt-3 text-zinc-700 dark:text-zinc-300">{prompt.prompt}</p>

      {prompt.data && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {prompt.data.headers.map((h) => (
                  <th key={h} className="border border-zinc-300 px-3 py-1.5 text-left dark:border-zinc-700">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {prompt.data.rows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td key={j} className="border border-zinc-300 px-3 py-1.5 dark:border-zinc-700">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="在这里写作文，草稿会自动保存到本地..."
        className="mt-4 h-80 w-full rounded-lg border border-zinc-300 p-4 leading-relaxed dark:border-zinc-700 dark:bg-zinc-900"
      />

      <div className="mt-2 flex items-center justify-between text-sm text-zinc-500">
        <span>
          {wordCount} / {prompt.minWords} 词
        </span>
        {error && <span className="text-rose-600">{error}</span>}
      </div>

      <button
        onClick={submit}
        disabled={isPending || wordCount < 30}
        className="mt-4 w-full rounded-full bg-zinc-900 px-6 py-3 font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {isPending ? "AI 评分中..." : "提交评分"}
      </button>
    </div>
  );
}
