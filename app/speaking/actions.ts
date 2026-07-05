"use server";

import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { db } from "@/lib/db";
import { speakingSessions } from "@/lib/db/schema";
import { transcribeAudio } from "@/lib/asr";
import { completeJSON } from "@/lib/llm";
import { findTopicById } from "@/lib/speaking-topics";
import { completeMultimodal, isMultimodalEnabled, resolveMultimodalProvider } from "@/lib/multimodal";

function ensureAudioDir() {
  const dir = path.join(process.cwd(), "data", "audio", "speaking");
  return mkdir(dir, { recursive: true });
}

function audioFileName(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webm`;
}

export async function transcribeTurn(
  formData: FormData
): Promise<{ text: string; audioPath: string }> {
  const file = formData.get("audio");
  if (!(file instanceof File)) throw new Error("没有收到音频");
  const buf = Buffer.from(await file.arrayBuffer());
  const text = await transcribeAudio(buf);

  await ensureAudioDir();
  const relativePath = path.join("data", "audio", "speaking", audioFileName());
  const absolutePath = path.join(process.cwd(), relativePath);
  await writeFile(absolutePath, buf);

  return { text, audioPath: relativePath };
}

export interface SpeakingTranscript {
  part1: { question: string; answer: string }[];
  part2: { cueCard: string; answer: string };
  part3: { question: string; answer: string }[];
}

export async function generatePart3Questions(
  topicId: string,
  part2Answer: string
): Promise<string[]> {
  const topic = findTopicById(topicId);
  if (!topic) throw new Error("话题不存在");

  const prompt = `你是雅思口语考官。考生刚完成 Part 2 关于"${topic.part2.cueCard}"的回答：
"""
${part2Answer}
"""
请生成 3 个 Part 3 的深入讨论问题（更抽象、更有延展性，围绕同一主题但不重复 Part 2 的内容）。
只输出 JSON：{ "questions": ["...", "...", "..."] }`;

  const result = await completeJSON<{ questions: string[] }>("speaking_reply", prompt);
  return result.questions;
}

export interface SpeakingFeedback {
  bandOverall: number;
  bandFluency: number;
  bandVocab: number;
  bandGrammar: number;
  bandPronunciation: number;
  summary: string;
  strengths: string[];
  improvements: string[];
}

export async function gradeSpeakingSession(
  topicId: string,
  transcript: SpeakingTranscript,
  audioPaths: string[] = []
): Promise<{ id: number }> {
  const transcriptText = [
    "Part 1:",
    ...transcript.part1.map((t) => `Q: ${t.question}\nA: ${t.answer}`),
    "\nPart 2:",
    `Cue card: ${transcript.part2.cueCard}\nA: ${transcript.part2.answer}`,
    "\nPart 3:",
    ...transcript.part3.map((t) => `Q: ${t.question}\nA: ${t.answer}`),
  ].join("\n\n");

  const system =
    "你是一名资深雅思口语考官，按官方四维标准（Fluency and Coherence / Lexical Resource / " +
    "Grammatical Range and Accuracy / Pronunciation）评分。";

  const textOnlySystem =
    system +
    "你只能看到文字转写，无法真正听到语音，因此 Pronunciation 只能基于用词选择和转写通顺程度做粗略估计，" +
    "必须在 summary 里明确提醒这一点仅供参考。只输出 JSON。";

  const prompt = `以下是一次雅思口语模拟的完整转写：

${transcriptText}

请输出：
{
  "bandOverall": number,
  "bandFluency": number,
  "bandVocab": number,
  "bandGrammar": number,
  "bandPronunciation": number,
  "summary": "整体评价，包含对 Pronunciation 评分局限性的说明，中文",
  "strengths": ["优点1", "优点2"],
  "improvements": ["改进点1", "改进点2", "改进点3"]
}`;

  let feedback: SpeakingFeedback;
  const mmProvider = await resolveMultimodalProvider();

  if (mmProvider && audioPaths.length > 0 && (await isMultimodalEnabled())) {
    try {
      const mmSystem =
        system +
        "本次评分除了文字转写，还提供了考生的原始音频，请结合发音、语调、流利度给出更准确的评分，" +
        "尤其是 Pronunciation 维度。只输出 JSON。";
      const raw = await completeMultimodal(
        mmProvider.model,
        mmProvider.baseUrl ?? "http://localhost:11434",
        prompt,
        audioPaths,
        { system: mmSystem }
      );
      feedback = JSON.parse(raw) as SpeakingFeedback;
    } catch {
      // 多模态评分失败时回退到文字评分
      feedback = await completeJSON<SpeakingFeedback>("speaking_grading", prompt, {
        system: textOnlySystem,
      });
    }
  } else {
    feedback = await completeJSON<SpeakingFeedback>("speaking_grading", prompt, {
      system: textOnlySystem,
    });
  }

  const now = new Date();
  const result = db
    .insert(speakingSessions)
    .values({
      topicId,
      transcriptJson: transcript,
      bandFluency: feedback.bandFluency,
      bandVocab: feedback.bandVocab,
      bandGrammar: feedback.bandGrammar,
      bandPronunciation: feedback.bandPronunciation,
      feedbackJson: feedback,
      audioPath: audioPaths[0] ?? null,
      createdAt: now,
    })
    .run();

  return { id: Number(result.lastInsertRowid) };
}
