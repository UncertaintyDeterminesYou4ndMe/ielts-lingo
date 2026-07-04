import { fetchCached } from "./fetch-cache";
import { ECDICT_CSV_URL, parseCsvLine } from "./ecdict";

export interface DictEntry {
  word: string;
  phonetic: string | null;
  pos: string | null;
  translation: string;
}

// 只收单个字母词（含连字符/撇号），去掉词组和含数字/空格的杂项，把 65MB 词库压到可用规模。
const WORD_RE = /^[a-z][a-z'-]*$/;

/** 把 ECDICT 整库清洗成 word(小写) -> DictEntry，供点词查义使用。 */
export async function loadFullDictionary(): Promise<DictEntry[]> {
  const buf = await fetchCached(ECDICT_CSV_URL, "ecdict.csv");
  const text = buf.toString("utf-8");
  const lines = text.split("\n");

  const header = parseCsvLine(lines[0]);
  const wordIdx = header.indexOf("word");
  const phoneticIdx = header.indexOf("phonetic");
  const translationIdx = header.indexOf("translation");
  const posIdx = header.indexOf("pos");

  const seen = new Set<string>();
  const entries: DictEntry[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const fields = parseCsvLine(line);
    const rawWord = (fields[wordIdx] ?? "").trim().toLowerCase();
    if (!rawWord || !WORD_RE.test(rawWord) || seen.has(rawWord)) continue;

    const rawTranslation = (fields[translationIdx] ?? "").trim();
    if (!rawTranslation) continue;

    // ECDICT 的 translation 用字面 \n 分隔多条释义，转成分号，去掉 [网络] 等噪声行
    const translation = rawTranslation
      .split(/\\n/)
      .map((s) => s.trim())
      .filter((s) => s && !s.startsWith("[网络]"))
      .join("；");
    if (!translation) continue;

    seen.add(rawWord);
    entries.push({
      word: rawWord,
      phonetic: fields[phoneticIdx]?.trim() || null,
      pos: fields[posIdx]?.trim() || null,
      translation,
    });
  }

  return entries;
}
