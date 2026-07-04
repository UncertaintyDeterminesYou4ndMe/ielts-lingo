import AdmZip from "adm-zip";
import { fetchCached } from "./fetch-cache";

// kajweb/dict 的雅思词书压缩包（NDJSON 格式，每行一个单词）
const BOOKS = [
  {
    url: "https://raw.githubusercontent.com/kajweb/dict/master/book/1521164657744_IELTS_2.zip",
    zipName: "IELTS_2.zip",
    jsonName: "IELTS_2.json",
  },
  {
    url: "https://raw.githubusercontent.com/kajweb/dict/master/book/1521164666922_IELTS_3.zip",
    zipName: "IELTS_3.zip",
    jsonName: "IELTS_3.json",
  },
];

export interface KajwebWord {
  headword: string;
  phoneticUk: string | null;
  phoneticUs: string | null;
  pos: string | null;
  meaningCn: string;
  example: string | null;
  exampleCn: string | null;
}

interface KajwebLine {
  headWord: string;
  content: {
    word: {
      content: {
        ukphone?: string;
        usphone?: string;
        phone?: string;
        trans?: { pos: string; tranCn: string }[];
        sentence?: { sentences?: { sContent: string; sCn: string }[] };
      };
    };
  };
}

function parseLine(line: string): KajwebWord | null {
  if (!line.trim()) return null;
  let obj: KajwebLine;
  try {
    obj = JSON.parse(line);
  } catch {
    return null;
  }
  const c = obj.content?.word?.content;
  if (!c) return null;

  const trans = c.trans ?? [];
  if (trans.length === 0) return null;
  const meaningCn = trans.map((t) => `${t.pos}. ${t.tranCn}`).join("；");
  const sentence = c.sentence?.sentences?.[0];

  return {
    headword: obj.headWord.trim(),
    phoneticUk: c.ukphone ?? c.phone ?? null,
    phoneticUs: c.usphone ?? c.phone ?? null,
    pos: trans[0]?.pos ?? null,
    meaningCn,
    example: sentence?.sContent ?? null,
    exampleCn: sentence?.sCn ?? null,
  };
}

/** 拉取 kajweb/dict 的雅思词书（IELTS_2 + IELTS_3），按首次出现去重合并。 */
export async function loadKajwebIeltsWords(): Promise<Map<string, KajwebWord>> {
  const merged = new Map<string, KajwebWord>();

  for (const book of BOOKS) {
    const zipBuf = await fetchCached(book.url, book.zipName);
    const zip = new AdmZip(zipBuf);
    const entry = zip.getEntry(book.jsonName);
    if (!entry) {
      throw new Error(`压缩包 ${book.zipName} 里找不到 ${book.jsonName}`);
    }
    const text = entry.getData().toString("utf-8");
    let count = 0;
    for (const line of text.split("\n")) {
      const word = parseLine(line);
      if (!word) continue;
      if (!merged.has(word.headword.toLowerCase())) {
        merged.set(word.headword.toLowerCase(), word);
        count++;
      }
    }
    console.log(`  ${book.jsonName}: 新增 ${count} 个词`);
  }

  return merged;
}
