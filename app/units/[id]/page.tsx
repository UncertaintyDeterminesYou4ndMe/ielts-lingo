import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { units, words } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export default async function UnitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const unitId = Number(id);

  const unit = await db.query.units.findFirst({ where: eq(units.id, unitId) });
  if (!unit) notFound();

  const wordRows = await db
    .select()
    .from(words)
    .where(eq(words.unitId, unitId))
    .orderBy(words.headword);

  return (
    <main className="mx-auto max-w-4xl p-8">
      <Link href="/" className="text-sm text-zinc-500 hover:underline">
        ← 返回关卡地图
      </Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{unit.title}</h1>
          <p className="mt-1 text-zinc-600 dark:text-zinc-400">
            难度带 Lv.{unit.bandLevel} · {wordRows.length} 词
          </p>
        </div>
        <Link
          href={`/learn/${unit.id}`}
          className="rounded-full bg-emerald-600 px-6 py-2 font-medium text-white hover:bg-emerald-700"
        >
          开始学习
        </Link>
      </div>

      <div className="mt-6 divide-y divide-zinc-200 dark:divide-zinc-800">
        {wordRows.map((w) => (
          <div key={w.id} className="py-3">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="text-lg font-medium">{w.headword}</span>
              {w.phoneticUk && (
                <span className="text-sm text-zinc-500">英 /{w.phoneticUk}/</span>
              )}
              {w.phoneticUs && (
                <span className="text-sm text-zinc-500">美 /{w.phoneticUs}/</span>
              )}
            </div>
            <p className="whitespace-pre-line text-sm text-zinc-700 dark:text-zinc-300">
              {w.meaningCn}
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}
