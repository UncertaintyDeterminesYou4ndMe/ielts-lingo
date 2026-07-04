import Link from "next/link";
import { ESSAY_PROMPTS } from "@/lib/essay-prompts";

export default function WritingHome() {
  const t1 = ESSAY_PROMPTS.filter((p) => p.taskType === "T1");
  const t2 = ESSAY_PROMPTS.filter((p) => p.taskType === "T2");

  return (
    <main className="mx-auto max-w-3xl p-8">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm text-zinc-500 hover:underline">
          ← 返回首页
        </Link>
        <Link href="/writing/history" className="text-sm text-zinc-500 hover:underline">
          历史记录 →
        </Link>
      </div>
      <h1 className="mt-2 text-2xl font-semibold">写作批改</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        选一个题目开始写作，提交后由 AI 按雅思官方四维标准评分。
      </p>

      <h2 className="mt-8 text-lg font-medium">Task 1（小作文 · 20分钟 · 150词+）</h2>
      <div className="mt-3 grid gap-2">
        {t1.map((p) => (
          <Link
            key={p.id}
            href={`/writing/${p.id}`}
            className="rounded-lg border border-zinc-200 px-4 py-3 hover:border-zinc-400 dark:border-zinc-700"
          >
            {p.title}
          </Link>
        ))}
      </div>

      <h2 className="mt-8 text-lg font-medium">Task 2（大作文 · 40分钟 · 250词+）</h2>
      <div className="mt-3 grid gap-2">
        {t2.map((p) => (
          <Link
            key={p.id}
            href={`/writing/${p.id}`}
            className="rounded-lg border border-zinc-200 px-4 py-3 hover:border-zinc-400 dark:border-zinc-700"
          >
            {p.title}
          </Link>
        ))}
      </div>
    </main>
  );
}
