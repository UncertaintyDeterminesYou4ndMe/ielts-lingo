"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createListeningLesson } from "./actions";

const SECTIONS: { value: 1 | 2 | 3 | 4; label: string }[] = [
  { value: 1, label: "Section 1 · 日常对话" },
  { value: 2, label: "Section 2 · 独白介绍" },
  { value: 3, label: "Section 3 · 学术讨论" },
  { value: 4, label: "Section 4 · 学术讲座" },
];

export default function ListeningLauncher() {
  const [isPending, startTransition] = useTransition();
  const [pendingSection, setPendingSection] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function generate(section: 1 | 2 | 3 | 4) {
    setError(null);
    setPendingSection(section);
    startTransition(async () => {
      const res = await createListeningLesson(section);
      if (res.ok) {
        router.push(`/listening/${res.lessonId}`);
      } else {
        setError(res.error);
        setPendingSection(null);
      }
    });
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        {SECTIONS.map((s) => (
          <button
            key={s.value}
            onClick={() => generate(s.value)}
            disabled={isPending}
            className="rounded-lg border border-zinc-200 px-4 py-3 text-left hover:border-zinc-400 disabled:opacity-50 dark:border-zinc-700"
          >
            {s.label}
          </button>
        ))}
      </div>
      {isPending && (
        <p className="mt-3 text-sm text-zinc-500">
          正在生成 Section {pendingSection} 素材（LLM 出题 + 本地配音，约 10-30 秒）...
        </p>
      )}
      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
    </div>
  );
}
