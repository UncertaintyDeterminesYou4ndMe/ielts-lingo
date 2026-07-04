"use server";

import { db } from "@/lib/db";
import { essays } from "@/lib/db/schema";
import { completeJSON } from "@/lib/llm";
import { findPromptById } from "@/lib/essay-prompts";
import { TASK1_RUBRIC, TASK2_RUBRIC } from "@/lib/essay-rubric";

export interface EssayFeedback {
  bandOverall: number;
  bandTr: number;
  bandCc: number;
  bandLr: number;
  bandGra: number;
  summary: string;
  issues: { quote: string; problem: string; suggestion: string }[];
  topImprovements: string[];
  upgradedParagraph: string;
}

export interface GradeEssayInput {
  promptId: string;
  body: string;
}

export async function gradeEssay(input: GradeEssayInput): Promise<{ id: number }> {
  const promptDef = findPromptById(input.promptId);
  if (!promptDef) throw new Error("题目不存在");
  if (input.body.trim().split(/\s+/).length < 30) {
    throw new Error("作文太短，至少写 30 个词再提交评分");
  }

  const rubric = promptDef.taskType === "T1" ? TASK1_RUBRIC : TASK2_RUBRIC;
  const system =
    "你是一名资深雅思考官，严格按照官方四维评分标准给作文打分，评分要客观、有区分度，不要无脑打高分。只输出 JSON。";

  const dataTable = promptDef.data
    ? `\n数据：\n${promptDef.data.headers.join(" | ")}\n${promptDef.data.rows
        .map((r) => r.join(" | "))
        .join("\n")}\n`
    : "";

  const user = `任务类型：${promptDef.taskType}
题目：${promptDef.prompt}
${dataTable}
学生作文（字数 ${input.body.trim().split(/\s+/).length}）：
"""
${input.body}
"""

${rubric}

请输出以下 JSON 结构（不要输出其他内容）：
{
  "bandOverall": number,
  "bandTr": number,
  "bandCc": number,
  "bandLr": number,
  "bandGra": number,
  "summary": "整体评价，2-3句中文",
  "issues": [
    { "quote": "原文里的问题句子", "problem": "问题是什么", "suggestion": "修改后的句子" }
  ],
  "topImprovements": ["最重要的改进点1", "改进点2", "改进点3"],
  "upgradedParagraph": "挑一段原文改写成更高分版本，中英文都可以但以英文为主"
}
issues 数组给 3-6 条最有代表性的问题句。`;

  const feedback = await completeJSON<EssayFeedback>("essay_grading", user, { system });

  const now = new Date();
  const result = db
    .insert(essays)
    .values({
      taskType: promptDef.taskType,
      prompt: promptDef.prompt,
      body: input.body,
      bandOverall: feedback.bandOverall,
      bandTr: feedback.bandTr,
      bandCc: feedback.bandCc,
      bandLr: feedback.bandLr,
      bandGra: feedback.bandGra,
      feedbackJson: feedback,
      createdAt: now,
    })
    .run();

  return { id: Number(result.lastInsertRowid) };
}
