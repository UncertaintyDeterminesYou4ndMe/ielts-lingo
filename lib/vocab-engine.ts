import type { InferSelectModel } from "drizzle-orm";
import type { words } from "./db/schema";

export type WordRow = InferSelectModel<typeof words>;

export type Question =
  | {
      kind: "meaning-choice";
      wordId: number;
      headword: string;
      phoneticUk: string | null;
      phoneticUs: string | null;
      options: string[];
      answerIndex: number;
    }
  | {
      kind: "word-choice";
      wordId: number;
      headword: string;
      meaning: string;
      options: string[];
      answerIndex: number;
    }
  | {
      kind: "spelling";
      wordId: number;
      headword: string;
      meaning: string;
    }
  | {
      kind: "cloze";
      wordId: number;
      headword: string;
      sentence: string;
      meaning: string;
    };

/** 从存储的 meaningCn（可能带例句/多词性拼接）提取一个适合选项展示的短释义。 */
export function shortMeaning(w: WordRow): string {
  const core = w.meaningCn.split("\n例：")[0];
  return core.split("；")[0].trim();
}

function shuffleWithAnswer(answer: string, distractors: string[]) {
  const options = [answer, ...distractors];
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  return { options, answerIndex: options.indexOf(answer) };
}

function pickDistractors(target: WordRow, pool: WordRow[], n: number): WordRow[] {
  const sameBand = pool.filter((w) => w.id !== target.id && w.bandLevel === target.bandLevel);
  const source = sameBand.length >= n ? sameBand : pool.filter((w) => w.id !== target.id);
  const shuffled = [...source].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function findWordInExample(word: WordRow): RegExp | null {
  if (!word.example) return null;
  const escaped = word.headword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`\\b${escaped}\\w*\\b`, "i");
  return re.test(word.example) ? re : null;
}

/**
 * 为一组目标词生成混合题型的题目列表。
 * pool 是同一课程/复习批次里的候选词，用来抽取干扰项（要求 pool.length 覆盖 target）。
 */
export function generateQuestions(target: WordRow[], pool: WordRow[]): Question[] {
  return target.map((w, i) => {
    const typeSlot = i % 4;

    if (typeSlot === 0) {
      const distractors = pickDistractors(w, pool, 3).map(shortMeaning);
      const { options, answerIndex } = shuffleWithAnswer(shortMeaning(w), distractors);
      return {
        kind: "meaning-choice",
        wordId: w.id,
        headword: w.headword,
        phoneticUk: w.phoneticUk,
        phoneticUs: w.phoneticUs,
        options,
        answerIndex,
      };
    }

    if (typeSlot === 1) {
      const distractors = pickDistractors(w, pool, 3).map((d) => d.headword);
      const { options, answerIndex } = shuffleWithAnswer(w.headword, distractors);
      return {
        kind: "word-choice",
        wordId: w.id,
        headword: w.headword,
        meaning: shortMeaning(w),
        options,
        answerIndex,
      };
    }

    if (typeSlot === 3) {
      const match = findWordInExample(w);
      if (match && w.example) {
        return {
          kind: "cloze",
          wordId: w.id,
          headword: w.headword,
          sentence: w.example.replace(match, "____"),
          meaning: shortMeaning(w),
        };
      }
      // 没有可用例句时退化为拼写题
    }

    return {
      kind: "spelling",
      wordId: w.id,
      headword: w.headword,
      meaning: shortMeaning(w),
    };
  });
}
