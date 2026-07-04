import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { lessons } from "@/lib/db/schema";
import type { ReadingItem } from "@/lib/reading-generator";
import ReadingPlayer from "../reading-player";

export default async function ReadingLessonPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = await params;
  const id = Number(lessonId);
  const lesson = await db.query.lessons.findFirst({ where: eq(lessons.id, id) });
  if (!lesson) notFound();

  if (!lesson.contentJson) {
    return (
      <main className="mx-auto max-w-3xl p-8 text-center text-zinc-500">
        素材生成失败，请返回重新生成。
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl p-8">
      <ReadingPlayer lessonId={id} item={lesson.contentJson as ReadingItem} />
    </main>
  );
}
