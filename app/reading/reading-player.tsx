"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { ReadingItem } from "@/lib/reading-generator";
import { submitReadingAnswers } from "./actions";
import type { SubmitAnswersResult } from "@/app/listening/actions";
import WordLookupText from "@/app/components/word-lookup-text";

const TFNG_OPTIONS = ["True", "False", "Not Given"];

export default function ReadingPlayer({ lessonId, item }: { lessonId: number; item: ReadingItem }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<SubmitAnswersResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const paragraphs = item.passage.split(/\n+/).filter((p) => p.trim());
  const answeredCount = Object.keys(answers).length;

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await submitReadingAnswers(lessonId, answers);
        setResult(res);
      } catch (e) {
        setError(e instanceof Error ? e.message : "提交失败");
      }
    });
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        {item.title}
      </h1>

      <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        点击文中任意单词查看释义与发音
      </div>

      <article className="mt-5 space-y-4">
        {paragraphs.map((para, i) => (
          <WordLookupText
            key={i}
            text={para}
            className="text-[1.0625rem] leading-[1.9] text-zinc-800 dark:text-zinc-200"
          />
        ))}
      </article>

      <div className="my-8 h-px bg-zinc-200 dark:bg-zinc-800" />

      <div className="space-y-3">
        {item.questions.map((q, i) => {
          const options = q.type === "true-false-notgiven" ? TFNG_OPTIONS : q.options ?? [];
          const detail = result?.detail.find((d) => d.id === q.id);
          return (
            <div
              key={q.id}
              className="rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800"
            >
              <p className="font-medium leading-relaxed text-zinc-900 dark:text-zinc-100">
                <span className="mr-1.5 text-zinc-400">{i + 1}.</span>
                {q.prompt}
              </p>
              <div className="mt-3 grid gap-1.5">
                {options.map((opt) => {
                  const selected = answers[q.id] === opt;
                  const isAnswer = result && opt === detail?.correctAnswer;
                  const isWrongPick = result && selected && !detail?.correct;
                  let tone =
                    "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600";
                  if (isAnswer)
                    tone = "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50";
                  else if (isWrongPick)
                    tone = "border-rose-400 bg-rose-50 dark:bg-rose-950/50";
                  else if (selected) tone = "border-zinc-400 dark:border-zinc-500";
                  return (
                    <label
                      key={opt}
                      className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm transition-colors active:scale-[0.99] ${tone} ${
                        result ? "pointer-events-none" : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name={q.id}
                        value={opt}
                        disabled={!!result}
                        checked={selected}
                        onChange={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
                        className="accent-emerald-600"
                      />
                      <span className="text-zinc-800 dark:text-zinc-200">{opt}</span>
                    </label>
                  );
                })}
              </div>
              {detail && (
                <p
                  className={`mt-2.5 text-sm font-medium ${
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

      {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}

      {!result ? (
        <button
          onClick={submit}
          disabled={isPending || answeredCount === 0}
          className="mt-6 w-full rounded-full bg-zinc-900 px-6 py-3.5 font-medium text-white transition-transform active:scale-[0.99] disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {isPending
            ? "评分中..."
            : answeredCount < item.questions.length
              ? `提交答案（已答 ${answeredCount}/${item.questions.length}）`
              : "提交答案"}
        </button>
      ) : (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center dark:border-emerald-900 dark:bg-emerald-950/50">
          <div className="text-3xl font-semibold text-emerald-700 dark:text-emerald-300">
            {result.correct} / {result.total}
          </div>
          <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400">
            +{result.xpEarned} XP · 今日 XP {result.todayXp} · 连胜 {result.streak} 天
          </p>
        </div>
      )}

      <Link
        href="/reading"
        className="mt-6 block text-sm text-zinc-500 transition-colors hover:text-zinc-800 dark:hover:text-zinc-300"
      >
        ← 返回阅读练习列表
      </Link>
    </div>
  );
}
