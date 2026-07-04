"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { ListeningItem } from "@/lib/listening-generator";
import { submitListeningAnswers, type SubmitAnswersResult } from "./actions";
import WordLookupText from "@/app/components/word-lookup-text";

export default function ListeningPlayer({
  lessonId,
  item,
}: {
  lessonId: number;
  item: ListeningItem;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<SubmitAnswersResult | null>(null);
  const [showScript, setShowScript] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await submitListeningAnswers(lessonId, answers);
        setResult(res);
      } catch (e) {
        setError(e instanceof Error ? e.message : "提交失败");
      }
    });
  }

  return (
    <div>
      <h1 className="text-xl font-semibold">
        Section {item.section} · {item.topic}
      </h1>

      <audio controls src={item.audioUrl} className="mt-4 w-full" />

      <div className="mt-6 space-y-4">
        {item.questions.map((q, i) => {
          const detail = result?.detail.find((d) => d.id === q.id);
          return (
            <div key={q.id} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
              <p className="font-medium">
                {i + 1}. {q.prompt}
              </p>
              {q.options ? (
                <div className="mt-2 grid gap-1.5">
                  {q.options.map((opt) => (
                    <label key={opt} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={q.id}
                        value={opt}
                        disabled={!!result}
                        checked={answers[q.id] === opt}
                        onChange={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              ) : (
                <input
                  value={answers[q.id] ?? ""}
                  disabled={!!result}
                  onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                  className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-1.5 dark:border-zinc-700 dark:bg-zinc-900"
                  placeholder="填写答案"
                />
              )}
              {detail && (
                <p
                  className={`mt-2 text-sm font-medium ${
                    detail.correct
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {detail.correct ? "回答正确" : `答错了，正确答案：${detail.correctAnswer}`}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

      {!result ? (
        <button
          onClick={submit}
          disabled={isPending}
          className="mt-6 w-full rounded-full bg-zinc-900 px-6 py-3 font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {isPending ? "评分中..." : "提交答案"}
        </button>
      ) : (
        <div className="mt-6 rounded-lg bg-emerald-50 p-4 text-center dark:bg-emerald-950">
          <p className="text-lg font-medium">
            {result.correct} / {result.total} 答对
          </p>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            +{result.xpEarned} XP · 今日 XP {result.todayXp} · 连胜 {result.streak} 天
          </p>
        </div>
      )}

      <button
        onClick={() => setShowScript((s) => !s)}
        className="mt-6 text-sm text-zinc-500 underline"
      >
        {showScript ? "隐藏原文" : "查看原文"}
      </button>
      {showScript && (
        <div className="mt-2 rounded-2xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900/60">
          <p className="mb-3 text-xs text-zinc-400">点击任意单词查看释义</p>
          <div className="space-y-2.5 text-sm">
            {item.script.map((line, i) => (
              <div key={i} className="flex gap-2">
                <span className="shrink-0 font-medium text-emerald-700 dark:text-emerald-400">
                  {line.speaker}
                </span>
                <WordLookupText text={line.text} className="text-zinc-700 dark:text-zinc-300" />
              </div>
            ))}
          </div>
        </div>
      )}

      <Link href="/listening" className="mt-6 block text-sm text-zinc-500 hover:underline">
        ← 返回听力练习列表
      </Link>
    </div>
  );
}
