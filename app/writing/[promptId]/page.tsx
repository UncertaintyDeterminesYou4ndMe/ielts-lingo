import { notFound } from "next/navigation";
import Link from "next/link";
import { findPromptById } from "@/lib/essay-prompts";
import EssayEditor from "../essay-editor";

export default async function WritingPromptPage({
  params,
}: {
  params: Promise<{ promptId: string }>;
}) {
  const { promptId } = await params;
  const prompt = findPromptById(promptId);
  if (!prompt) notFound();

  return (
    <main className="mx-auto max-w-3xl p-8">
      <Link href="/writing" className="text-sm text-zinc-500 hover:underline">
        ← 返回题库
      </Link>
      <div className="mt-4">
        <EssayEditor key={prompt.id} prompt={prompt} />
      </div>
    </main>
  );
}
