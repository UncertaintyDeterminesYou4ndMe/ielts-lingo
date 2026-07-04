import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { speakingSessions } from "@/lib/db/schema";
import { findTopicById } from "@/lib/speaking-topics";

export const dynamic = "force-dynamic";

export default async function SpeakingHistoryPage() {
  const rows = await db.select().from(speakingSessions).orderBy(desc(speakingSessions.createdAt));

  return (
    <main className="mx-auto max-w-3xl p-8">
      <Link href="/speaking" className="text-sm text-zinc-500 hover:underline">
        ← 返回口语首页
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">口语历史</h1>

      {rows.length === 0 ? (
        <p className="mt-6 text-zinc-500">还没有完成过口语陪练。</p>
      ) : (
        <div className="mt-6 space-y-2">
          {rows.map((s) => {
            const topic = findTopicById(s.topicId);
            const overall =
              s.bandFluency != null && s.bandVocab != null && s.bandGrammar != null && s.bandPronunciation != null
                ? (s.bandFluency + s.bandVocab + s.bandGrammar + s.bandPronunciation) / 4
                : null;
            return (
              <Link
                key={s.id}
                href={`/speaking/sessions/${s.id}`}
                className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3 hover:border-zinc-400 dark:border-zinc-700"
              >
                <div>
                  <div className="font-medium">{topic?.title ?? s.topicId}</div>
                  <div className="text-sm text-zinc-500">
                    {new Date(s.createdAt).toLocaleDateString("zh-CN")}
                  </div>
                </div>
                <span className="font-medium">{overall?.toFixed(1) ?? "-"}</span>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
