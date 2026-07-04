"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { speak } from "@/lib/browser-speech";
import { SpeakerIcon, CloseIcon } from "./icons";

interface LookupData {
  found: boolean;
  word?: string;
  query?: string;
  phonetic?: string | null;
  pos?: string | null;
  translation?: string;
}

interface PopoverState {
  x: number;
  y: number;
  above: boolean;
  word: string;
  data: LookupData | null; // null = 加载中
}

type Token = { w: true; v: string } | { w: false; v: string };

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  const re = /[A-Za-z]+(?:['-][A-Za-z]+)*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) tokens.push({ w: false, v: text.slice(last, m.index) });
    tokens.push({ w: true, v: m[0] });
    last = m.index + m[0].length;
  }
  if (last < text.length) tokens.push({ w: false, v: text.slice(last) });
  return tokens;
}

export default function WordLookupText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const [pop, setPop] = useState<PopoverState | null>(null);
  const popRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setPop(null), []);

  const onWordClick = useCallback(
    async (e: React.MouseEvent<HTMLSpanElement>, word: string) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const above = rect.top > window.innerHeight * 0.55;
      const x = Math.min(Math.max(rect.left + rect.width / 2, 160), window.innerWidth - 160);
      const y = above ? rect.top - 8 : rect.bottom + 8;
      setPop({ x, y, above, word, data: null });

      try {
        const res = await fetch(`/api/lookup?word=${encodeURIComponent(word)}`);
        const data = (await res.json()) as LookupData;
        setPop((prev) => (prev && prev.word === word ? { ...prev, data } : prev));
      } catch {
        setPop((prev) => (prev && prev.word === word ? { ...prev, data: { found: false } } : prev));
      }
    },
    []
  );

  // 点外部 / Esc 关闭
  useEffect(() => {
    if (!pop) return;
    function onDocClick(e: MouseEvent) {
      if (popRef.current && !popRef.current.contains(e.target as Node)) close();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    // 延迟绑定，避免与触发点击同一事件冲突
    const t = setTimeout(() => document.addEventListener("mousedown", onDocClick), 0);
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [pop, close]);

  const tokens = tokenize(text);

  return (
    <>
      <p className={className}>
        {tokens.map((tok, i) =>
          tok.w ? (
            <span
              key={i}
              onClick={(e) => onWordClick(e, tok.v)}
              className={`cursor-pointer rounded-[3px] transition-colors hover:bg-emerald-100 hover:text-emerald-900 dark:hover:bg-emerald-900/40 dark:hover:text-emerald-100 ${
                pop?.word === tok.v ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100" : ""
              }`}
            >
              {tok.v}
            </span>
          ) : (
            <span key={i}>{tok.v}</span>
          )
        )}
      </p>

      {pop && (
        <div
          ref={popRef}
          role="dialog"
          style={{
            position: "fixed",
            left: pop.x,
            top: pop.y,
            transform: `translateX(-50%) ${pop.above ? "translateY(-100%)" : ""}`,
            zIndex: 50,
          }}
          className="w-72 rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.18)] dark:border-zinc-700/80 dark:bg-zinc-900 dark:shadow-[0_16px_40px_-12px_rgba(0,0,0,0.6)]"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  {pop.data?.word ?? pop.word}
                </span>
                <button
                  onClick={() => speak(pop.data?.word ?? pop.word)}
                  aria-label="朗读"
                  className="shrink-0 text-emerald-600 transition-transform active:scale-90 dark:text-emerald-400"
                >
                  <SpeakerIcon className="text-lg" />
                </button>
              </div>
              {pop.data?.phonetic && (
                <div className="mt-0.5 text-sm text-zinc-500">/{pop.data.phonetic}/</div>
              )}
            </div>
            <button
              onClick={close}
              aria-label="关闭"
              className="shrink-0 text-zinc-400 transition-transform active:scale-90 hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              <CloseIcon className="text-base" />
            </button>
          </div>

          <div className="mt-3">
            {pop.data === null ? (
              <div className="space-y-2" aria-label="加载中">
                <div className="h-3 w-3/4 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
              </div>
            ) : pop.data.found ? (
              <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                {pop.data.pos && (
                  <span className="mr-1.5 rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800">
                    {pop.data.pos}
                  </span>
                )}
                {pop.data.translation}
              </p>
            ) : (
              <p className="text-sm text-zinc-400">词典里没有这个词（可能是专有名词或拼写变体）。</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
