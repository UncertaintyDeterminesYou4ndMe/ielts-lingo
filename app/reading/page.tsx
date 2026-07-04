import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { lessons } from "@/lib/db/schema";
import type { ReadingItem } from "@/lib/reading-generator";
import ReadingLauncher from "./reading-launcher";

export const dynamic = "force-dynamic";

export default async function ReadingPage() {
  const rows = await db
    .select()
    .from(lessons)
    .where(eq(lessons.type, "reading"))
    .orderBy(desc(lessons.id));

  return (
    <main className="mx-auto max-w-3xl p-8">
      <Link href="/" className="text-sm text-zinc-500 hover:underline">
        ← 返回首页
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">阅读练习</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        短文由 AI 现场生成，题型覆盖 True/False/Not Given 和单选。
      </p>

      <div className="mt-6">
        <ReadingLauncher />
      </div>

      {rows.length > 0 && (
        <>
          <h2 className="mt-8 text-lg font-medium">历史练习</h2>
          <div className="mt-3 space-y-2">
            {rows.map((r) => {
              const item = r.contentJson as ReadingItem | null;
              return (
                <Link
                  key={r.id}
                  href={`/reading/${r.id}`}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3 hover:border-zinc-400 dark:border-zinc-700"
                >
                  <span>{item?.title ?? "(生成失败)"}</span>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </main>
  );
}
