import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { lessons } from "@/lib/db/schema";
import type { ListeningItem } from "@/lib/listening-generator";
import ListeningLauncher from "./listening-launcher";

export const dynamic = "force-dynamic";

export default async function ListeningPage() {
  const rows = await db
    .select()
    .from(lessons)
    .where(eq(lessons.type, "listening"))
    .orderBy(desc(lessons.id));

  return (
    <main className="mx-auto max-w-3xl p-8">
      <Link href="/" className="text-sm text-zinc-500 hover:underline">
        ← 返回首页
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">听力练习</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        素材由 AI 按雅思四个 Section 的场景现场生成，配音本地合成。
      </p>

      <div className="mt-6">
        <ListeningLauncher />
      </div>

      {rows.length > 0 && (
        <>
          <h2 className="mt-8 text-lg font-medium">历史练习</h2>
          <div className="mt-3 space-y-2">
            {rows.map((r) => {
              const item = r.contentJson as ListeningItem | null;
              return (
                <Link
                  key={r.id}
                  href={`/listening/${r.id}`}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3 hover:border-zinc-400 dark:border-zinc-700"
                >
                  <span>
                    Section {item?.section ?? "?"} · {item?.topic ?? "(生成中或失败)"}
                  </span>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </main>
  );
}
