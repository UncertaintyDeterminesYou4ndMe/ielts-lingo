import { notFound } from "next/navigation";
import Link from "next/link";
import { findTopicById } from "@/lib/speaking-topics";
import SpeakingSession from "../session-client";

export default async function SpeakingTopicPage({
  params,
}: {
  params: Promise<{ topicId: string }>;
}) {
  const { topicId } = await params;
  const topic = findTopicById(topicId);
  if (!topic) notFound();

  return (
    <main className="mx-auto max-w-2xl p-8">
      <Link href="/speaking" className="text-sm text-zinc-500 hover:underline">
        ← 返回话题列表
      </Link>
      <div className="mt-6">
        <SpeakingSession topic={topic} />
      </div>
    </main>
  );
}
