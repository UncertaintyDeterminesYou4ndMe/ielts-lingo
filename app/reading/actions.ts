"use server";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { attempts, lessons, mistakes } from "@/lib/db/schema";
import { generateReadingItem, type ReadingItem } from "@/lib/reading-generator";
import { newCardFields } from "@/lib/fsrs";
import { awardXp } from "@/lib/stats";
import type { AnswerDetail, SubmitAnswersResult } from "@/app/listening/actions";

// 返回结果而非抛异常：生产构建会把抛出的错误信息脱敏成无意义的通用提示，
// 用返回值传错误才能把真实原因（如"无法连接模型"）展示给用户。
export type CreateLessonResult =
  | { ok: true; lessonId: number }
  | { ok: false; error: string };

export async function createReadingLesson(): Promise<CreateLessonResult> {
  try {
    const item = await generateReadingItem();
    const result = db
      .insert(lessons)
      .values({ unitId: null, type: "reading", order: 0, contentJson: item })
      .run();
    return { ok: true, lessonId: Number(result.lastInsertRowid) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "生成失败" };
  }
}

export async function submitReadingAnswers(
  lessonId: number,
  answers: Record<string, string>
): Promise<SubmitAnswersResult> {
  const lesson = db.select().from(lessons).where(eq(lessons.id, lessonId)).get();
  if (!lesson?.contentJson) throw new Error("练习不存在");
  const item = lesson.contentJson as ReadingItem;

  const now = new Date();
  let correct = 0;
  const detail: AnswerDetail[] = item.questions.map((q) => {
    const userAnswer = (answers[q.id] ?? "").trim();
    const isCorrect = userAnswer.toLowerCase() === q.answer.trim().toLowerCase();
    if (isCorrect) {
      correct++;
    } else {
      db.insert(mistakes)
        .values({
          sourceType: "reading",
          payloadJson: { lessonId, question: q.prompt, correctAnswer: q.answer, userAnswer },
          ...newCardFields(now),
        })
        .run();
    }
    return { id: q.id, correct: isCorrect, correctAnswer: q.answer, userAnswer };
  });

  const score = item.questions.length > 0 ? correct / item.questions.length : 0;
  db.insert(attempts)
    .values({ lessonId, kind: "lesson", startedAt: now, score, detailJson: detail })
    .run();

  const xpEarned = correct * 10;
  const stats = awardXp(xpEarned, item.questions.length * 0.8, now);

  return { correct, total: item.questions.length, xpEarned, todayXp: stats.xp, streak: stats.streak, detail };
}
