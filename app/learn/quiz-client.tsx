"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import type { Question } from "@/lib/vocab-engine";
import { speak } from "@/lib/browser-speech";
import { SpeakerIcon } from "@/app/components/icons";
import { submitPracticeResult, type PracticeResultSummary } from "./actions";

interface Props {
  questions: Question[];
  kind: "lesson" | "review";
  unitId: number | null;
  backHref: string;
}

type Phase = "asking" | "feedback" | "done";

export default function QuizClient({ questions, kind, unitId, backHref }: Props) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("asking");
  const [selected, setSelected] = useState<number | null>(null);
  const [textAnswer, setTextAnswer] = useState("");
  const [wasCorrect, setWasCorrect] = useState(false);
  const [results, setResults] = useState<{ wordId: number; correct: boolean }[]>([]);
  const [summary, setSummary] = useState<PracticeResultSummary | null>(null);
  const [, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const q = questions[index];

  // 切换到新题目时重置上一题的选择/输入状态（渲染期间调整，而非放进 effect）
  const [prevIndex, setPrevIndex] = useState(index);
  if (prevIndex !== index) {
    setPrevIndex(index);
    setSelected(null);
    setTextAnswer("");
  }

  useEffect(() => {
    if (q && (q.kind === "meaning-choice" || q.kind === "word-choice")) {
      speak(q.headword);
    }
    inputRef.current?.focus();
  }, [index, q]);

  function commit(correct: boolean) {
    if (!q) return;
    setWasCorrect(correct);
    setPhase("feedback");
    setResults((r) => [...r, { wordId: q.wordId, correct }]);
  }

  function submitChoice(i: number) {
    if (phase !== "asking" || !q) return;
    if (q.kind !== "meaning-choice" && q.kind !== "word-choice") return;
    setSelected(i);
    commit(i === q.answerIndex);
  }

  function submitText() {
    if (phase !== "asking" || !q) return;
    if (q.kind !== "spelling" && q.kind !== "cloze") return;
    commit(textAnswer.trim().toLowerCase() === q.headword.toLowerCase());
  }

  function finish(finalResults: { wordId: number; correct: boolean }[]) {
    setPhase("done");
    startTransition(async () => {
      const res = await submitPracticeResult({ kind, unitId, results: finalResults });
      setSummary(res);
    });
  }

  function next() {
    if (index + 1 < questions.length) {
      setIndex((i) => i + 1);
      setPhase("asking");
    } else {
      finish(results);
    }
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!q) return;
      const inTextField = (e.target as HTMLElement)?.tagName === "INPUT";

      if (phase === "asking" && (q.kind === "meaning-choice" || q.kind === "word-choice")) {
        const n = Number(e.key);
        if (n >= 1 && n <= q.options.length) submitChoice(n - 1);
      }
      if (phase === "asking" && (q.kind === "spelling" || q.kind === "cloze") && e.key === "Enter") {
        submitText();
      }
      if (phase === "feedback" && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        next();
      }
      if (!inTextField && e.key === " " && phase === "asking") {
        e.preventDefault();
        speak(q.headword);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (phase === "done") {
    if (!summary) {
      return <div className="p-8 text-center text-zinc-500">正在结算...</div>;
    }
    return (
      <div className="mx-auto max-w-md p-8 text-center">
        <h1 className="text-2xl font-semibold">完成！</h1>
        <p className="mt-4 text-lg">
          {summary.correctCount} / {summary.total} 答对
        </p>
        <p className="mt-2 text-amber-600 dark:text-amber-400">+{summary.xpEarned} XP</p>
        <p className="mt-1 text-zinc-500">
          今日 XP：{summary.todayXp} · 连胜 {summary.streak} 天
        </p>
        <Link
          href={backHref}
          className="mt-6 inline-block rounded-full bg-zinc-900 px-6 py-2 text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          返回
        </Link>
      </div>
    );
  }

  if (!q) {
    return (
      <div className="mx-auto max-w-md p-8 text-center text-zinc-500">
        没有可练习的内容。
        <Link href={backHref} className="mt-4 block underline">
          返回
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg p-8">
      <div className="mb-6 h-1.5 w-full rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div
          className="h-1.5 rounded-full bg-emerald-500 transition-all"
          style={{ width: `${(index / questions.length) * 100}%` }}
        />
      </div>

      {q.kind === "meaning-choice" && (
        <div>
          <p className="mb-3 text-sm font-medium text-emerald-600 dark:text-emerald-400">
            选择这个单词的正确中文释义
          </p>
          <div className="flex items-center gap-2">
            <p className="text-3xl font-semibold">{q.headword}</p>
            <button
              onClick={() => speak(q.headword)}
              className="text-xl text-emerald-600 transition-transform active:scale-90 dark:text-emerald-400"
              aria-label="发音"
            >
              <SpeakerIcon />
            </button>
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            {q.phoneticUk && `英 /${q.phoneticUk}/ `}
            {q.phoneticUs && `美 /${q.phoneticUs}/`}
          </p>
          <div className="mt-6 grid gap-2">
            {q.options.map((opt, i) => (
              <OptionButton
                key={i}
                index={i}
                label={opt}
                phase={phase}
                selected={selected}
                answerIndex={q.answerIndex}
                onClick={() => submitChoice(i)}
              />
            ))}
          </div>
        </div>
      )}

      {q.kind === "word-choice" && (
        <div>
          <p className="mb-3 text-sm font-medium text-emerald-600 dark:text-emerald-400">
            选择与下面中文释义对应的英文单词
          </p>
          <p className="text-2xl font-medium">{q.meaning}</p>
          <div className="mt-6 grid gap-2">
            {q.options.map((opt, i) => (
              <OptionButton
                key={i}
                index={i}
                label={opt}
                phase={phase}
                selected={selected}
                answerIndex={q.answerIndex}
                onClick={() => submitChoice(i)}
              />
            ))}
          </div>
        </div>
      )}

      {(q.kind === "spelling" || q.kind === "cloze") && (
        <div>
          <p className="mb-3 text-sm font-medium text-emerald-600 dark:text-emerald-400">
            {q.kind === "cloze"
              ? "根据句意和中文提示，拼写填入空格的单词"
              : "根据中文释义和发音，拼写这个单词"}
          </p>
          {q.kind === "cloze" ? (
            <>
              <p className="text-xl leading-relaxed">{q.sentence}</p>
              <p className="mt-2 text-sm text-zinc-500">提示（中文释义）：{q.meaning}</p>
            </>
          ) : (
            <p className="text-2xl font-medium">{q.meaning}</p>
          )}
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => speak(q.headword)}
              className="text-xl text-emerald-600 transition-transform active:scale-90 dark:text-emerald-400"
              aria-label="发音"
            >
              <SpeakerIcon />
            </button>
            <span className="text-sm text-zinc-500">点喇叭听发音</span>
          </div>
          <input
            ref={inputRef}
            value={textAnswer}
            onChange={(e) => setTextAnswer(e.target.value)}
            disabled={phase !== "asking"}
            className="mt-3 w-full rounded-lg border border-zinc-300 px-3 py-2 text-lg dark:border-zinc-700 dark:bg-zinc-900"
            placeholder="输入拼写，回车提交"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
          />
          {phase === "feedback" && (
            <p className={`mt-2 ${wasCorrect ? "text-emerald-600" : "text-rose-600"}`}>
              正确答案：{q.headword}
            </p>
          )}
        </div>
      )}

      {phase === "feedback" && (
        <button
          onClick={next}
          className="mt-6 w-full rounded-full bg-zinc-900 px-6 py-3 text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          继续（Enter）
        </button>
      )}
    </div>
  );
}

function OptionButton({
  index,
  label,
  phase,
  selected,
  answerIndex,
  onClick,
}: {
  index: number;
  label: string;
  phase: Phase;
  selected: number | null;
  answerIndex: number;
  onClick: () => void;
}) {
  let style = "border-zinc-300 dark:border-zinc-700";
  if (phase === "feedback") {
    if (index === answerIndex) style = "border-emerald-500 bg-emerald-50 dark:bg-emerald-950";
    else if (index === selected) style = "border-rose-500 bg-rose-50 dark:bg-rose-950";
  }
  return (
    <button
      onClick={onClick}
      disabled={phase !== "asking"}
      className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-left ${style}`}
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs">
        {index + 1}
      </span>
      {label}
    </button>
  );
}
