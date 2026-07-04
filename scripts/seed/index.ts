import { db } from "../../lib/db";
import { attempts, cards, dictionary, lessons, units, words } from "../../lib/db/schema";
import { loadKajwebIeltsWords, type KajwebWord } from "./lib/kajweb";
import { loadEcdictIeltsWords, type EcdictWord } from "./lib/ecdict";
import { loadFullDictionary } from "./lib/dictionary";

const WORDS_PER_UNIT = 25;
const BAND_COUNT = 5;

interface MergedWord {
  headword: string;
  phoneticUk: string | null;
  phoneticUs: string | null;
  pos: string | null;
  meaningCn: string;
  example: string | null;
  score: number; // 越小越常见/越简单，用于分难度带
}

function cleanEcdictTranslation(raw: string): string {
  return raw
    .split(/\\n/)
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith("["))
    .join("；");
}

function scoreOf(headwordLower: string, ecdict: Map<string, EcdictWord>): number {
  const e = ecdict.get(headwordLower);
  if (!e) return 5_000_000; // 未知难度，稍后归入中间难度带
  if (e.frq > 0) return e.frq;
  if (e.bnc > 0) return 1_000_000 + e.bnc;
  return 5_000_000;
}

function mergeWords(
  kajweb: Map<string, KajwebWord>,
  ecdict: Map<string, EcdictWord>
): MergedWord[] {
  const merged: MergedWord[] = [];
  const seen = new Set<string>();

  for (const [lower, w] of kajweb) {
    merged.push({
      headword: w.headword,
      phoneticUk: w.phoneticUk,
      phoneticUs: w.phoneticUs,
      pos: w.pos,
      meaningCn: w.example ? `${w.meaningCn}\n例：${w.example}（${w.exampleCn ?? ""}）` : w.meaningCn,
      example: w.example,
      score: scoreOf(lower, ecdict),
    });
    seen.add(lower);
  }

  // ECDICT 里有但 kajweb 词书没收录的 ielts 标记词，作为补充
  for (const [lower, e] of ecdict) {
    if (seen.has(lower)) continue;
    if (!e.translation) continue;
    const meaningCn = cleanEcdictTranslation(e.translation);
    if (!meaningCn) continue;
    merged.push({
      headword: e.headword,
      phoneticUk: e.phonetic,
      phoneticUs: e.phonetic,
      pos: e.pos?.split(/\s+/)[0] ?? null,
      meaningCn,
      example: null,
      score: scoreOf(lower, ecdict),
    });
    seen.add(lower);
  }

  return merged;
}

/** 按频率分数切成 5 个难度带；分数未知的词（score===5_000_000）默认落中间带 3。 */
function assignBands(list: MergedWord[]): (MergedWord & { bandLevel: number })[] {
  const UNKNOWN = 5_000_000;
  const known = list.filter((w) => w.score !== UNKNOWN).sort((a, b) => a.score - b.score);

  const bandOf = new Map<string, number>();
  const chunkSize = Math.ceil(known.length / BAND_COUNT);
  known.forEach((w, i) => {
    const band = Math.min(BAND_COUNT, Math.floor(i / chunkSize) + 1);
    bandOf.set(w.headword, band);
  });

  return list.map((w) => ({ ...w, bandLevel: bandOf.get(w.headword) ?? 3 }));
}

/** 词典表独立填充：只要表为空就灌数据，不受词库 seed 守卫影响（老库升级也能补上）。 */
async function seedDictionary(force: boolean) {
  const hasDict = db.select({ w: dictionary.word }).from(dictionary).limit(1).all().length > 0;
  if (hasDict && !force) {
    console.log("词典表已存在，跳过（如需重建：npm run seed -- --force）。");
    return;
  }
  console.log("填充点词查义词典（ECDICT 全库）...");
  const entries = await loadFullDictionary();
  db.delete(dictionary).run();
  db.transaction((tx) => {
    for (const e of entries) {
      tx.insert(dictionary)
        .values({ word: e.word, phonetic: e.phonetic, pos: e.pos, translation: e.translation })
        .run();
    }
  });
  console.log(`  词典写入 ${entries.length} 条。`);
}

async function main() {
  const force = process.argv.includes("--force");

  await seedDictionary(force);

  const existing = db.select({ id: words.id }).from(words).limit(1).all();
  if (existing.length > 0 && !force) {
    console.log(
      "数据库里已有词库数据，跳过词库 seed（会清空已学进度）。如需强制重新拉取和覆盖，运行 `npm run seed -- --force`。"
    );
    return;
  }

  console.log("1/4 拉取 kajweb/dict 雅思词书 ...");
  const kajweb = await loadKajwebIeltsWords();

  console.log("2/4 拉取 ECDICT 频率/难度数据 ...");
  const ecdict = await loadEcdictIeltsWords();

  console.log("3/4 合并去重、按频率分难度带 ...");
  const merged = mergeWords(kajweb, ecdict);
  const banded = assignBands(merged);
  banded.sort((a, b) => a.score - b.score);

  const bandCounts = new Map<number, number>();
  for (const w of banded) bandCounts.set(w.bandLevel, (bandCounts.get(w.bandLevel) ?? 0) + 1);
  console.log(`  共 ${banded.length} 个词，难度带分布：`, Object.fromEntries(bandCounts));

  console.log("4/4 写入数据库 ...");
  // --force 会清空已学进度（cards/attempts），因为词库和 unit 结构会重新生成
  db.delete(attempts).run();
  db.delete(cards).run();
  db.delete(lessons).run();
  db.delete(words).run();
  db.delete(units).run();

  let unitId = 0;
  let unitOrder = 0;
  const unitRows: (typeof units.$inferInsert)[] = [];
  const wordRows: (typeof words.$inferInsert)[] = [];
  const lessonRows: (typeof lessons.$inferInsert)[] = [];

  for (let band = 1; band <= BAND_COUNT; band++) {
    const wordsInBand = banded.filter((w) => w.bandLevel === band);
    const chunkCount = Math.ceil(wordsInBand.length / WORDS_PER_UNIT);
    for (let c = 0; c < chunkCount; c++) {
      unitId++;
      unitOrder++;
      unitRows.push({
        id: unitId,
        title: `词汇 Lv.${band} · 第 ${c + 1} 课`,
        theme: "vocab-generic", // TODO(P1): 接入 Ollama 做主题分类后替换为场景化标题
        order: unitOrder,
        bandLevel: band,
      });
      lessonRows.push({
        unitId,
        type: "vocab",
        order: 1,
        contentJson: null, // 词汇课内容按 unit 的词表在运行时动态生成，无需预存
      });
      const chunk = wordsInBand.slice(c * WORDS_PER_UNIT, (c + 1) * WORDS_PER_UNIT);
      for (const w of chunk) {
        wordRows.push({
          headword: w.headword,
          phoneticUk: w.phoneticUk,
          phoneticUs: w.phoneticUs,
          pos: w.pos,
          meaningCn: w.meaningCn,
          example: w.example,
          bandLevel: w.bandLevel,
          unitId,
        });
      }
    }
  }

  db.transaction((tx) => {
    for (const row of unitRows) tx.insert(units).values(row).run();
    for (const row of lessonRows) tx.insert(lessons).values(row).run();
    for (const row of wordRows) tx.insert(words).values(row).run();
  });

  console.log(`完成：写入 ${unitRows.length} 个 unit，${lessonRows.length} 个 lesson，${wordRows.length} 个词。`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
