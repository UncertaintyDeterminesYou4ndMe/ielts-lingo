import Link from "next/link";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { speakingSessions } from "@/lib/db/schema";
import type { SpeakingFeedback, SpeakingTranscript } from "../../actions";
import { findTopicById } from "@/lib/speaking-topics";

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

export default async function SpeakingSessionResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await db.query.speakingSessions.findFirst({
    where: eq(speakingSessions.id, Number(id)),
  });
  if (!session) notFound();

  const feedback = session.feedbackJson as SpeakingFeedback | null;
  const transcript = session.transcriptJson as SpeakingTranscript | null;
  const topic = findTopicById(session.topicId);
  const overall = feedback
    ? (feedback.bandFluency + feedback.bandVocab + feedback.bandGrammar + feedback.bandPronunciation) / 4
    : null;

  return (
    <main className="mx-auto max-w-3xl p-8">
      <Link href="/speaking/history" className="text-sm text-zinc-500 hover:underline">
        ← 历史记录
      </Link>

      <div className="mt-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          {topic?.title ?? session.topicId} · {new Date(session.createdAt).toLocaleString("zh-CN")}
        </h1>
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600 text-2xl font-bold text-white">
          {feedback?.bandOverall?.toFixed(1) ?? overall?.toFixed(1) ?? "-"}
        </div>
      </div>

      {!feedback ? (
        <p className="mt-6 text-rose-600">评分数据缺失。</p>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-4">
            <BandBar label="Fluency & Coherence" value={session.bandFluency} />
            <BandBar label="Lexical Resource" value={session.bandVocab} />
            <BandBar label="Grammatical Range & Accuracy" value={session.bandGrammar} />
            <BandBar label="Pronunciation（仅供参考）" value={session.bandPronunciation} />
          </div>

          <p className="mt-6 text-zinc-700 dark:text-zinc-300">{feedback.summary}</p>

          <h2 className="mt-8 text-lg font-medium">优点</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-zinc-700 dark:text-zinc-300">
            {feedback.strengths?.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>

          <h2 className="mt-8 text-lg font-medium">改进建议</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-zinc-700 dark:text-zinc-300">
            {feedback.improvements?.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </>
      )}

      {transcript && (
        <>
          <h2 className="mt-8 text-lg font-medium">转写记录</h2>
          <div className="mt-2 space-y-4 text-sm">
            <div>
              <p className="font-medium text-zinc-500">Part 1</p>
              {transcript.part1.map((t, i) => (
                <p key={i} className="mt-1">
                  <span className="text-zinc-500">Q: {t.question}</span>
                  <br />
                  A: {t.answer}
                </p>
              ))}
            </div>
            <div>
              <p className="font-medium text-zinc-500">Part 2</p>
              <p className="mt-1">
                <span className="text-zinc-500">Cue card: {transcript.part2.cueCard}</span>
                <br />
                A: {transcript.part2.answer}
              </p>
            </div>
            <div>
              <p className="font-medium text-zinc-500">Part 3</p>
              {transcript.part3.map((t, i) => (
                <p key={i} className="mt-1">
                  <span className="text-zinc-500">Q: {t.question}</span>
                  <br />
                  A: {t.answer}
                </p>
              ))}
            </div>
          </div>
        </>
      )}
    </main>
  );
}
