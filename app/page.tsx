import Link from "next/link";
import { db } from "@/lib/db";
import { units, words } from "@/lib/db/schema";
import { sql, eq } from "drizzle-orm";
import { getTodayStats, getDueReviewCount } from "@/lib/stats";

export const dynamic = "force-dynamic";

export default async function Home() {
  const todayStats = getTodayStats();
  const dueCount = getDueReviewCount();

  const unitRows = await db
    .select({
      id: units.id,
      title: units.title,
      bandLevel: units.bandLevel,
      order: units.order,
      wordCount: sql<number>`count(${words.id})`,
    })
    .from(units)
    .leftJoin(words, eq(words.unitId, units.id))
    .groupBy(units.id)
    .orderBy(units.order);

  if (unitRows.length === 0) {
    return (
      <main className="mx-auto max-w-3xl p-8">
        <h1 className="text-2xl font-semibold">IELTS Lingo</h1>
        <p className="mt-4 text-zinc-600 dark:text-zinc-400">
          还没有数据。先运行 <code className="rounded bg-zinc-100 px-1.5 py-0.5 dark:bg-zinc-800">npm run seed</code> 拉取并落库雅思词库。
        </p>
      </main>
    );
  }

  const byBand = new Map<number, typeof unitRows>();
  for (const u of unitRows) {
    if (!byBand.has(u.bandLevel)) byBand.set(u.bandLevel, []);
    byBand.get(u.bandLevel)!.push(u);
  }

  const totalWords = unitRows.reduce((sum, u) => sum + Number(u.wordCount), 0);

  return (
    <main className="mx-auto max-w-4xl p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">IELTS Lingo · 关卡地图</h1>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-amber-600 dark:text-amber-400">🔥 连胜 {todayStats.streak} 天</span>
          <span className="text-emerald-600 dark:text-emerald-400">今日 +{todayStats.xp} XP</span>
          {dueCount > 0 ? (
            <Link
              href="/review"
              className="rounded-full bg-rose-600 px-4 py-1.5 font-medium text-white hover:bg-rose-700"
            >
              复习 {dueCount}
            </Link>
          ) : (
            <span className="text-zinc-400">复习已清空</span>
          )}
        </div>
      </div>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        共 {unitRows.length} 个 Unit，{totalWords} 个词。数据来源：kajweb/dict + ECDICT。
      </p>

      {[...byBand.entries()].map(([band, unitsInBand]) => (
        <section key={band} className="mt-8">
          <h2 className="text-lg font-medium text-zinc-800 dark:text-zinc-200">
            难度带 Lv.{band}（{unitsInBand.length} 课）
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {unitsInBand.map((u) => (
              <Link
                key={u.id}
                href={`/units/${u.id}`}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-500"
              >
                <div className="font-medium">{u.title}</div>
                <div className="text-zinc-500 dark:text-zinc-400">{u.wordCount} 词</div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
