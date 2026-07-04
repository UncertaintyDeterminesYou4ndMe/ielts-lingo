"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { attempts, cards, lessons } from "@/lib/db/schema";
import { newCardFields, nextCardFields, type DbCardFields } from "@/lib/fsrs";
import { awardXp } from "@/lib/stats";

export interface PracticeResultInput {
  kind: "lesson" | "review";
  unitId: number | null;
  results: { wordId: number; correct: boolean }[];
}

export interface PracticeResultSummary {
  correctCount: number;
  total: number;
  xpEarned: number;
  todayXp: number;
  streak: number;
}

function cardRowToFields(row: typeof cards.$inferSelect): DbCardFields {
  return {
    due: row.due,
    stability: row.stability,
    difficulty: row.difficulty,
    elapsedDays: row.elapsedDays,
    scheduledDays: row.scheduledDays,
    learningSteps: row.learningSteps,
    reps: row.reps,
    lapses: row.lapses,
    state: row.state,
    lastReview: row.lastReview,
  };
}

const SECONDS_PER_QUESTION = 18;

export async function submitPracticeResult(
  input: PracticeResultInput
): Promise<PracticeResultSummary> {
  const now = new Date();
  let correctCount = 0;

  for (const r of input.results) {
    if (r.correct) correctCount++;

    const existing = db.select().from(cards).where(eq(cards.wordId, r.wordId)).get();
    const currentFields = existing ? cardRowToFields(existing) : newCardFields(now);
    const next = nextCardFields(currentFields, r.correct, now);

    if (existing) {
      db.update(cards).set(next).where(eq(cards.id, existing.id)).run();
    } else {
      db.insert(cards).values({ wordId: r.wordId, ...next }).run();
    }
  }

  let lessonId: number | null = null;
  if (input.kind === "lesson" && input.unitId) {
    const lesson = db
      .select()
      .from(lessons)
      .where(and(eq(lessons.unitId, input.unitId), eq(lessons.type, "vocab")))
      .get();
    lessonId = lesson?.id ?? null;
  }

  const score = input.results.length > 0 ? correctCount / input.results.length : 0;
  db.insert(attempts)
    .values({
      lessonId,
      kind: input.kind,
      startedAt: now,
      score,
      detailJson: input.results,
    })
    .run();

  const xpEarned = correctCount * 10;
  const minutes = (input.results.length * SECONDS_PER_QUESTION) / 60;
  const stats = awardXp(xpEarned, minutes, now);

  return {
    correctCount,
    total: input.results.length,
    xpEarned,
    todayXp: stats.xp,
    streak: stats.streak,
  };
}
