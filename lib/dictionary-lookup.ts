import { eq } from "drizzle-orm";
import { db } from "./db";
import { dictionary } from "./db/schema";

export interface LookupResult {
  word: string; // 实际命中的词典词条（可能是还原后的原形）
  query: string; // 用户点选的原始词
  phonetic: string | null;
  pos: string | null;
  translation: string;
}

/**
 * 生成一个词的候选查询形式：原词 + 常见词形还原（复数/过去式/进行时/ise-ize 变体等）。
 * ECDICT 收原形，所以查不到时降级尝试还原形。顺序即优先级。
 */
function candidateForms(raw: string): string[] {
  const w = raw.toLowerCase().replace(/[^a-z'-]/g, "");
  if (!w) return [];
  const forms = new Set<string>([w]);

  // 英式 ise/isation ↔ 美式 ize/ization（ECDICT 多收美式）
  if (w.includes("ise")) forms.add(w.replace(/ise/g, "ize"));
  if (w.includes("isation")) forms.add(w.replace(/isation/g, "ization"));

  const add = (s: string) => s.length >= 2 && forms.add(s);

  // 复数 / 第三人称
  if (w.endsWith("ies")) add(w.slice(0, -3) + "y");
  if (w.endsWith("ses") || w.endsWith("xes") || w.endsWith("ches") || w.endsWith("shes"))
    add(w.slice(0, -2));
  if (w.endsWith("s")) add(w.slice(0, -1));

  // 过去式 / 过去分词
  if (w.endsWith("ied")) add(w.slice(0, -3) + "y");
  if (w.endsWith("ed")) {
    add(w.slice(0, -2)); // walked -> walk
    add(w.slice(0, -1)); // used -> use
  }

  // 进行时
  if (w.endsWith("ing")) {
    add(w.slice(0, -3)); // playing -> play
    add(w.slice(0, -3) + "e"); // making -> make
  }

  // 比较级 / 最高级
  if (w.endsWith("er")) add(w.slice(0, -2));
  if (w.endsWith("est")) add(w.slice(0, -3));

  // 双写辅音还原：running -> run, bigger -> big
  const doubled = w.match(/(.*?)([bcdfghjklmnpqrstvwz])\2(ing|ed|er|est)$/);
  if (doubled) add(doubled[1] + doubled[2]);

  // 副词 -ly
  if (w.endsWith("ly")) add(w.slice(0, -2));

  return [...forms];
}

export function lookupWord(raw: string): LookupResult | null {
  const forms = candidateForms(raw);
  for (const form of forms) {
    const row = db.select().from(dictionary).where(eq(dictionary.word, form)).get();
    if (row) {
      return {
        word: row.word,
        query: raw,
        phonetic: row.phonetic,
        pos: row.pos,
        translation: row.translation,
      };
    }
  }
  return null;
}
