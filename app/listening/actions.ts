"use server";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { attempts, lessons, mistakes } from "@/lib/db/schema";
import { generateListeningItem, type ListeningItem } from "@/lib/listening-generator";
import { newCardFields } from "@/lib/fsrs";
import { awardXp } from "@/lib/stats";

// 返回结果而非抛异常，理由同 reading/actions.ts。
export type CreateLessonResult =
  | { ok: true; lessonId: number }
  | { ok: false; error: string };

export async function createListeningLesson(
  section: 1 | 2 | 3 | 4
): Promise<CreateLessonResult> {
  // 先占一个 lessonId 用来命名音频文件；生成失败则删除这行，避免历史里留下空壳记录。
  const insertResult = db
    .insert(lessons)
    .values({ unitId: null, type: "listening", order: 0, contentJson: null })
    .run();
  const lessonId = Number(insertResult.lastInsertRowid);

  try {
    const item = await generateListeningItem(section, lessonId);
    db.update(lessons).set({ contentJson: item }).where(eq(lessons.id, lessonId)).run();
    return { ok: true, lessonId };
  } catch (e) {
    db.delete(lessons).where(eq(lessons.id, lessonId)).run();
    return { ok: false, error: e instanceof Error ? e.message : "生成失败" };
  }
}

export interface AnswerDetail {
  id: string;
  correct: boolean;
  correctAnswer: string;
  userAnswer: string;
}

export interface SubmitAnswersResult {
  correct: number;
  total: number;
  xpEarned: number;
  todayXp: number;
  streak: number;
  detail: AnswerDetail[];
}

export async function submitListeningAnswers(
  lessonId: number,
  answers: Record<string, string>
): Promise<SubmitAnswersResult> {
  const lesson = db.select().from(lessons).where(eq(lessons.id, lessonId)).get();
  if (!lesson?.contentJson) throw new Error("练习不存在");
  const item = lesson.contentJson as ListeningItem;

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
          sourceType: "listening",
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
  const stats = awardXp(xpEarned, item.questions.length * 0.5, now);

  return { correct, total: item.questions.length, xpEarned, todayXp: stats.xp, streak: stats.streak, detail };
}
