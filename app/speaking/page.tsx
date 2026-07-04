import Link from "next/link";
import { SPEAKING_TOPICS } from "@/lib/speaking-topics";

export default function SpeakingHome() {
  return (
    <main className="mx-auto max-w-3xl p-8">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm text-zinc-500 hover:underline">
          ← 返回首页
        </Link>
        <Link href="/speaking/history" className="text-sm text-zinc-500 hover:underline">
          历史记录 →
        </Link>
      </div>
      <h1 className="mt-2 text-2xl font-semibold">口语陪练</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        选一个话题，完整模拟 Part 1 → Part 2 → Part 3，AI 扮演考官动态追问并评分。
        需要浏览器麦克风权限，语音转写和评分需要本地/云端模型可用。
      </p>

      <div className="mt-6 grid gap-2">
        {SPEAKING_TOPICS.map((t) => (
          <Link
            key={t.id}
            href={`/speaking/${t.id}`}
            className="rounded-lg border border-zinc-200 px-4 py-3 hover:border-zinc-400 dark:border-zinc-700"
          >
            {t.title}
          </Link>
        ))}
      </div>
    </main>
  );
}
