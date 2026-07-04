import Link from "next/link";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { essays } from "@/lib/db/schema";
import type { EssayFeedback } from "../../actions";

function BandBar({ label, value }: { label: string; value: number | null }) {
  const v = value ?? 0;
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-zinc-600 dark:text-zinc-400">{label}</span>
        <span className="font-medium">{v.toFixed(1)}</span>
      </div>
      <div className="mt-1 h-2 w-full rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div
          className="h-2 rounded-full bg-emerald-500"
          style={{ width: `${Math.min(100, (v / 9) * 100)}%` }}
        />
      </div>
    </div>
  );
}

export default async function EssayResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const essay = await db.query.essays.findFirst({ where: eq(essays.id, Number(id)) });
  if (!essay) notFound();

  const feedback = essay.feedbackJson as EssayFeedback | null;

  return (
    <main className="mx-auto max-w-3xl p-8">
      <Link href="/writing/history" className="text-sm text-zinc-500 hover:underline">
        ← 历史记录
      </Link>

      <div className="mt-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          {essay.taskType} · {new Date(essay.createdAt).toLocaleString("zh-CN")}
        </h1>
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600 text-2xl font-bold text-white">
          {essay.bandOverall?.toFixed(1) ?? "-"}
        </div>
      </div>

      {!feedback ? (
        <p className="mt-6 text-rose-600">评分数据缺失。</p>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-4">
            <BandBar label="Task Response / Achievement" value={essay.bandTr} />
            <BandBar label="Coherence & Cohesion" value={essay.bandCc} />
            <BandBar label="Lexical Resource" value={essay.bandLr} />
            <BandBar label="Grammatical Range & Accuracy" value={essay.bandGra} />
          </div>

          <p className="mt-6 text-zinc-700 dark:text-zinc-300">{feedback.summary}</p>

          <h2 className="mt-8 text-lg font-medium">最重要的 3 个改进点</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-zinc-700 dark:text-zinc-300">
            {feedback.topImprovements?.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>

          <h2 className="mt-8 text-lg font-medium">逐句问题与修改</h2>
          <div className="mt-2 space-y-3">
            {feedback.issues?.map((issue, i) => (
              <div key={i} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
                <p className="text-rose-600 line-through decoration-rose-400">{issue.quote}</p>
                <p className="mt-1 text-sm text-zinc-500">{issue.problem}</p>
                <p className="mt-2 text-emerald-700 dark:text-emerald-400">→ {issue.suggestion}</p>
              </div>
            ))}
          </div>

          <h2 className="mt-8 text-lg font-medium">范文改写示例</h2>
          <p className="mt-2 whitespace-pre-line rounded-lg bg-zinc-50 p-4 leading-relaxed dark:bg-zinc-900">
            {feedback.upgradedParagraph}
          </p>
        </>
      )}

      <h2 className="mt-8 text-lg font-medium">原文</h2>
      <p className="mt-2 whitespace-pre-line text-zinc-700 dark:text-zinc-300">{essay.body}</p>
    </main>
  );
}
