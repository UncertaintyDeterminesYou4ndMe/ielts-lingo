import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { units, words } from "@/lib/db/schema";
import { generateQuestions } from "@/lib/vocab-engine";
import QuizClient from "../quiz-client";

export default async function LearnUnitPage({
  params,
}: {
  params: Promise<{ unitId: string }>;
}) {
  const { unitId } = await params;
  const id = Number(unitId);

  const unit = await db.query.units.findFirst({ where: eq(units.id, id) });
  if (!unit) notFound();

  const unitWords = await db
    .select()
    .from(words)
    .where(eq(words.unitId, id))
    .orderBy(words.id);

  const pool = await db
    .select()
    .from(words)
    .where(eq(words.bandLevel, unit.bandLevel))
    .limit(300);

  const questions = generateQuestions(unitWords, pool);

  return (
    <main>
      <QuizClient questions={questions} kind="lesson" unitId={id} backHref="/" />
    </main>
  );
}
