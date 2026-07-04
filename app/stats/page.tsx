import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { attempts, cards, essays, lessons, speakingSessions, userStats } from "@/lib/db/schema";
import { getDueReviewCount, getTodayStats } from "@/lib/stats";

export const dynamic = "force-dynamic";

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
      <div className="text-sm text-zinc-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-zinc-400">{sub}</div>}
    </div>
  );
}

function Trend({ values, max }: { values: number[]; max: number }) {
  const recent = values.slice(0, 14).reverse();
  if (recent.length === 0) {
    return <p className="text-sm text-zinc-400">还没有记录</p>;
  }
  return (
    <div className="flex h-12 items-end gap-1">
      {recent.map((v, i) => (
        <div
          key={i}
          className="w-3 rounded-t bg-emerald-500"
          style={{ height: `${Math.max(6, (v / max) * 100)}%` }}
          title={v.toFixed(2)}
        />
      ))}
    </div>
  );
}

export default async function StatsPage() {
  const todayStats = getTodayStats();
  const dueCount = getDueReviewCount();

  const totalCards = db.select({ id: cards.id }).from(cards).all().length;

  const allAttempts = await db
    .select({
      kind: attempts.kind,
      startedAt: attempts.startedAt,
      score: attempts.score,
      lessonType: lessons.type,
    })
    .from(attempts)
    .leftJoin(lessons, eq(attempts.lessonId, lessons.id))
    .orderBy(desc(attempts.startedAt));

  function moduleOf(a: (typeof allAttempts)[number]): "vocab" | "listening" | "reading" | "other" {
    if (a.kind === "review") return "vocab";
    if (a.lessonType === "listening" || a.lessonType === "reading") return a.lessonType;
    if (a.lessonType === "vocab") return "vocab";
    return "other";
  }

  const vocabScores = allAttempts.filter((a) => moduleOf(a) === "vocab").map((a) => a.score ?? 0);
  const listeningScores = allAttempts.filter((a) => moduleOf(a) === "listening").map((a) => a.score ?? 0);
  const readingScores = allAttempts.filter((a) => moduleOf(a) === "reading").map((a) => a.score ?? 0);

  const essayRows = await db.select().from(essays).orderBy(desc(essays.createdAt));
  const speakingRows = await db.select().from(speakingSessions).orderBy(desc(speakingSessions.createdAt));

  const speakingOverall = speakingRows
    .filter((s) => s.bandFluency != null && s.bandVocab != null && s.bandGrammar != null && s.bandPronunciation != null)
    .map((s) => (s.bandFluency! + s.bandVocab! + s.bandGrammar! + s.bandPronunciation!) / 4);

  const recentDays = db.select().from(userStats).orderBy(desc(userStats.date)).limit(14).all();

  const avg = (arr: number[]) => (arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null);

  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="text-2xl font-semibold">学习统计</h1>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="连胜" value={`${todayStats.streak} 天`} />
        <StatCard label="今日 XP" value={`${todayStats.xp}`} />
        <StatCard label="累计学过的词" value={`${totalCards}`} sub={`待复习 ${dueCount}`} />
        <StatCard label="学习天数" value={`${recentDays.length}`} sub="近 14 天有记录的天数" />
      </div>

      <h2 className="mt-10 text-lg font-medium">词汇</h2>
      <p className="mt-1 text-sm text-zinc-500">最近 {vocabScores.length} 次练习正确率</p>
      <Trend values={vocabScores} max={1} />

      <h2 className="mt-10 text-lg font-medium">听力</h2>
      <p className="mt-1 text-sm text-zinc-500">
        共 {listeningScores.length} 次练习
        {avg(listeningScores) != null && ` · 平均正确率 ${(avg(listeningScores)! * 100).toFixed(0)}%`}
      </p>
      <Trend values={listeningScores} max={1} />

      <h2 className="mt-10 text-lg font-medium">阅读</h2>
      <p className="mt-1 text-sm text-zinc-500">
        共 {readingScores.length} 次练习
        {avg(readingScores) != null && ` · 平均正确率 ${(avg(readingScores)! * 100).toFixed(0)}%`}
      </p>
      <Trend values={readingScores} max={1} />

      <h2 className="mt-10 text-lg font-medium">写作</h2>
      <p className="mt-1 text-sm text-zinc-500">
        共 {essayRows.length} 篇
        {avg(essayRows.map((e) => e.bandOverall ?? 0)) != null &&
          essayRows.length > 0 &&
          ` · 平均 Band ${avg(essayRows.map((e) => e.bandOverall ?? 0))!.toFixed(1)}`}
      </p>
      <Trend values={essayRows.map((e) => e.bandOverall ?? 0)} max={9} />

      <h2 className="mt-10 text-lg font-medium">口语</h2>
      <p className="mt-1 text-sm text-zinc-500">
        共 {speakingRows.length} 次
        {avg(speakingOverall) != null && ` · 平均 Band ${avg(speakingOverall)!.toFixed(1)}`}
      </p>
      <Trend values={speakingOverall} max={9} />
    </main>
  );
}
