import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { essays } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export default async function WritingHistoryPage() {
  const rows = await db.select().from(essays).orderBy(desc(essays.createdAt));

  const maxBand = 9;

  return (
    <main className="mx-auto max-w-3xl p-8">
      <Link href="/writing" className="text-sm text-zinc-500 hover:underline">
        ← 返回写作首页
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">写作历史</h1>

      {rows.length === 0 ? (
        <p className="mt-6 text-zinc-500">还没有提交过作文。</p>
      ) : (
        <div className="mt-6 space-y-2">
          {rows.map((e) => (
            <Link
              key={e.id}
              href={`/writing/essays/${e.id}`}
              className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3 hover:border-zinc-400 dark:border-zinc-700"
            >
              <div>
                <div className="font-medium">
                  {e.taskType} · {new Date(e.createdAt).toLocaleDateString("zh-CN")}
                </div>
                <div className="text-sm text-zinc-500 line-clamp-1">{e.prompt}</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-1.5 w-24 rounded-full bg-zinc-200 dark:bg-zinc-800">
                  <div
                    className="h-1.5 rounded-full bg-emerald-500"
                    style={{ width: `${((e.bandOverall ?? 0) / maxBand) * 100}%` }}
                  />
                </div>
                <span className="w-10 text-right font-medium">
                  {e.bandOverall?.toFixed(1) ?? "-"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
