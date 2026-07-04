"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createReadingLesson } from "./actions";

export default function ReadingLauncher() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function generate() {
    setError(null);
    startTransition(async () => {
      const res = await createReadingLesson();
      if (res.ok) {
        router.push(`/reading/${res.lessonId}`);
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div>
      <button
        onClick={generate}
        disabled={isPending}
        className="rounded-full bg-emerald-600 px-6 py-2.5 font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        {isPending ? "生成中（约10-20秒）..." : "生成新短文"}
      </button>
      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
    </div>
  );
}
