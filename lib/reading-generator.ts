import { completeJSON } from "./llm";

export interface ReadingQuestion {
  id: string;
  type: "true-false-notgiven" | "multiple-choice";
  prompt: string;
  options?: string[];
  answer: string;
}

export interface ReadingItem {
  title: string;
  passage: string;
  questions: ReadingQuestion[];
}

// 随机挑一个话题喂给模型，避免每次生成都是同一篇（尤其 DeepSeek 在 temperature 低时很稳定）。
const TOPICS = [
  "科技与人工智能",
  "环境与气候变化",
  "历史与考古发现",
  "社会与城市发展",
  "心理学与行为研究",
  "生物与自然生态",
  "健康与医学进展",
  "太空探索与天文",
  "教育与语言学习",
  "经济与全球贸易",
];

export async function generateReadingItem(): Promise<ReadingItem> {
  const topic = TOPICS[Math.floor(Math.random() * TOPICS.length)];
  const prompt = `请生成一篇雅思学术阅读短文练习，本次话题方向：${topic}。
要求：
- passage 是一篇 300-400 词的学术性短文，围绕上述话题方向，选取一个具体的小切入点，避免与常见范文雷同
- questions 生成 5 道题，其中至少 2 道是 true-false-notgiven 类型（answer 为 "True"/"False"/"Not Given"），
  其余是 multiple-choice（3-4个 options，answer 为正确选项原文）
- 题目和答案必须能从 passage 原文直接判断

只输出这个 JSON 结构：
{
  "title": "标题（中文）",
  "passage": "英文短文正文",
  "questions": [{ "id": "q1", "type": "true-false-notgiven", "prompt": "...", "answer": "True" }]
}`;

  return completeJSON<ReadingItem>("reading_passage", prompt, { temperature: 0.8 });
}
