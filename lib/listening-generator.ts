import path from "node:path";
import { completeJSON } from "./llm";
import { synthesizeScriptToFile, VOICES } from "./tts";

export interface ListeningQuestion {
  id: string;
  prompt: string;
  answer: string;
  options?: string[];
}

export interface ListeningItem {
  section: 1 | 2 | 3 | 4;
  topic: string;
  script: { speaker: string; text: string }[];
  questions: ListeningQuestion[];
  audioUrl: string;
}

const SECTION_BRIEF: Record<1 | 2 | 3 | 4, string> = {
  1: "两人日常场景对话（如预订、咨询、报名表格），语言简单，适合表格/笔记填空题。",
  2: "一人独白介绍设施、活动或旅游信息，适合笔记填空或单选题。",
  3: "2-3人学术讨论（学生和导师/同学讨论课业或研究），适合单选题。",
  4: "一人学术讲座独白，语言较难，适合笔记填空题。",
};

/** 生成一段听力素材（LLM 出脚本+题目，本地 TTS 合成配音）。 */
export async function generateListeningItem(
  section: 1 | 2 | 3 | 4,
  lessonId: number
): Promise<ListeningItem> {
  const prompt = `请为雅思听力 Section ${section} 生成一段练习素材。
场景要求：${SECTION_BRIEF[section]}

要求：
- script 是分句列表，每句标注 speaker（如 "Man"/"Woman"/"Lecturer"），共 12-20 句
- questions 生成 5 道题，题目和答案必须能从 script 原文直接得到
- gap-fill 题不需要 options 字段；multiple-choice 题需要 3-4 个 options（含正确答案原文）

只输出这个 JSON 结构：
{
  "topic": "简短主题（中文）",
  "script": [{ "speaker": "...", "text": "..." }],
  "questions": [{ "id": "q1", "prompt": "...", "answer": "...", "options": ["...", "..."] }]
}`;

  const raw = await completeJSON<Omit<ListeningItem, "audioUrl" | "section">>(
    "listening_script",
    prompt,
    { temperature: 0.8 }
  );

  const voicePool = [VOICES.us, VOICES.gb, VOICES.au, VOICES.usMale];
  const speakerVoice = new Map<string, string>();
  let voiceIdx = 0;
  const turns = raw.script.map((line) => {
    if (!speakerVoice.has(line.speaker)) {
      speakerVoice.set(line.speaker, voicePool[voiceIdx % voicePool.length]);
      voiceIdx++;
    }
    return { voice: speakerVoice.get(line.speaker)!, text: line.text };
  });

  const audioPath = path.join(process.cwd(), "public", "audio", "listening", `${lessonId}.mp3`);
  await synthesizeScriptToFile(turns, audioPath);

  return { ...raw, section, audioUrl: `/audio/listening/${lessonId}.mp3` };
}
