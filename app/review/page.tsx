import Link from "next/link";
import { eq, inArray, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { cards, words } from "@/lib/db/schema";
import { generateQuestions } from "@/lib/vocab-engine";
import QuizClient from "../learn/quiz-client";

const MAX_REVIEW_BATCH = 30;

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const now = new Date();

  const dueRows = await db
    .select({ word: words })
    .from(cards)
    .innerJoin(words, eq(words.id, cards.wordId))
    .where(lt(cards.due, now))
    .orderBy(cards.due)
    .limit(MAX_REVIEW_BATCH);

  const dueWords = dueRows.map((r) => r.word);

  if (dueWords.length === 0) {
    return (
      <main className="mx-auto max-w-md p-8 text-center">
        <h1 className="text-2xl font-semibold">复习</h1>
        <p className="mt-4 text-zinc-500">暂时没有到期的复习卡片，去学新词吧。</p>
        <Link href="/" className="mt-6 inline-block underline">
          返回关卡地图
        </Link>
      </main>
    );
  }

  const bandLevels = [...new Set(dueWords.map((w) => w.bandLevel))];
  const pool = await db
    .select()
    .from(words)
    .where(inArray(words.bandLevel, bandLevels))
    .limit(300);

  const questions = generateQuestions(dueWords, pool);

  return (
    <main>
      <QuizClient questions={questions} kind="review" unitId={null} backHref="/" />
    </main>
  );
}
