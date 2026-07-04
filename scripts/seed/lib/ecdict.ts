import { fetchCached } from "./fetch-cache";

const ECDICT_URL = "https://raw.githubusercontent.com/skywind3000/ECDICT/master/ecdict.csv";

export interface EcdictWord {
  headword: string;
  phonetic: string | null;
  translation: string | null; // 原始多行释义，形如 "n. xxx\nv. yyy"
  pos: string | null;
  collins: number; // 柯林斯星级 0-5
  frq: number; // 频率排名，0 表示未知，数字越小越常见
  bnc: number; // BNC 语料库频率排名，0 表示未知
  tags: string[];
}

export const ECDICT_CSV_URL = ECDICT_URL;

/** 解析单行 CSV（ECDICT 的引号字段里存的是字面 \n，不是真实换行，逐行 split 是安全的）。 */
export function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      fields.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  fields.push(cur);
  return fields;
}

/** 拉取 ECDICT，只保留 tag 含 ielts 的词条，返回 headword(小写) -> EcdictWord 的表。 */
export async function loadEcdictIeltsWords(): Promise<Map<string, EcdictWord>> {
  const buf = await fetchCached(ECDICT_URL, "ecdict.csv");
  const text = buf.toString("utf-8");
  const lines = text.split("\n");

  const header = parseCsvLine(lines[0]);
  const idx = (name: string) => header.indexOf(name);
  const wordIdx = idx("word");
  const phoneticIdx = idx("phonetic");
  const translationIdx = idx("translation");
  const posIdx = idx("pos");
  const collinsIdx = idx("collins");
  const tagIdx = idx("tag");
  const bncIdx = idx("bnc");
  const frqIdx = idx("frq");

  const result = new Map<string, EcdictWord>();
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const fields = parseCsvLine(line);
    const tagStr = fields[tagIdx] ?? "";
    const tags = tagStr.split(/\s+/).filter(Boolean);
    if (!tags.includes("ielts")) continue;

    const headword = (fields[wordIdx] ?? "").trim();
    if (!headword) continue;

    result.set(headword.toLowerCase(), {
      headword,
      phonetic: fields[phoneticIdx]?.trim() || null,
      translation: fields[translationIdx]?.trim() || null,
      pos: fields[posIdx]?.trim() || null,
      collins: Number(fields[collinsIdx]) || 0,
      frq: Number(fields[frqIdx]) || 0,
      bnc: Number(fields[bncIdx]) || 0,
      tags,
    });
  }
  console.log(`  ECDICT: 筛出 ${result.size} 个 ielts 标记词`);
  return result;
}
