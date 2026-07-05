import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

// 关卡地图章节，按雅思高频场景组织
export const units = sqliteTable("units", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  theme: text("theme").notNull(),
  order: integer("order").notNull(),
  bandLevel: integer("band_level").notNull(), // 1-5 难度带
});

// 雅思词库，来源 kajweb/dict + ECDICT
export const words = sqliteTable("words", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  headword: text("headword").notNull().unique(),
  phoneticUk: text("phonetic_uk"),
  phoneticUs: text("phonetic_us"),
  pos: text("pos"), // 词性
  meaningCn: text("meaning_cn").notNull(),
  example: text("example"),
  bandLevel: integer("band_level").notNull(), // 1-5，对应 ECDICT 词频/柯林斯星级切分
  unitId: integer("unit_id").references(() => units.id),
  distractors: text("distractors", { mode: "json" }).$type<string[]>(), // 预生成的中文释义干扰项
});

// 全量英汉词典（来源 ECDICT），供阅读/听力里点词查义。与雅思词库 words 分开：
// words 是要背的考纲词，dictionary 是查得到就行的通用词。
export const dictionary = sqliteTable("dictionary", {
  word: text("word").primaryKey(), // 小写，查询键
  phonetic: text("phonetic"),
  pos: text("pos"),
  translation: text("translation").notNull(),
});

// ts-fsrs Card 字段平铺，一个 word 对应一张复习卡
export const cards = sqliteTable("cards", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  wordId: integer("word_id")
    .notNull()
    .unique()
    .references(() => words.id),
  due: integer("due", { mode: "timestamp" }).notNull(),
  stability: real("stability").notNull(),
  difficulty: real("difficulty").notNull(),
  elapsedDays: real("elapsed_days").notNull(),
  scheduledDays: real("scheduled_days").notNull(),
  learningSteps: integer("learning_steps").notNull().default(0),
  reps: integer("reps").notNull(),
  lapses: integer("lapses").notNull(),
  state: integer("state").notNull(), // FSRS State enum: New/Learning/Review/Relearning
  lastReview: integer("last_review", { mode: "timestamp" }),
});

// 课程内容（词汇课/听力课/阅读课/写作课/口语课）
export const lessons = sqliteTable("lessons", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  // 词汇课挂在难度带 unit 下；听力/阅读课是按需生成的独立内容，不挂靠 unit
  unitId: integer("unit_id").references(() => units.id),
  type: text("type", {
    enum: ["vocab", "listening", "reading", "writing", "speaking"],
  }).notNull(),
  order: integer("order").notNull(),
  contentJson: text("content_json", { mode: "json" }).$type<unknown>(),
});

// 每次练习记录
export const attempts = sqliteTable("attempts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  // 复习批次可能跨多个 unit，没有单一 lesson，允许为空
  lessonId: integer("lesson_id").references(() => lessons.id),
  kind: text("kind", { enum: ["lesson", "review"] }).notNull().default("lesson"),
  startedAt: integer("started_at", { mode: "timestamp" }).notNull(),
  score: real("score"),
  detailJson: text("detail_json", { mode: "json" }).$type<unknown>(),
});

// 写作批改记录
export const essays = sqliteTable("essays", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  taskType: text("task_type", { enum: ["T1", "T2"] }).notNull(),
  prompt: text("prompt").notNull(),
  body: text("body").notNull(),
  bandOverall: real("band_overall"),
  bandTr: real("band_tr"),
  bandCc: real("band_cc"),
  bandLr: real("band_lr"),
  bandGra: real("band_gra"),
  feedbackJson: text("feedback_json", { mode: "json" }).$type<unknown>(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

// 口语陪练记录：一次 session 覆盖 Part 1+2+3，各部分内容都存在 transcriptJson 里
export const speakingSessions = sqliteTable("speaking_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  topicId: text("topic_id").notNull(),
  transcriptJson: text("transcript_json", { mode: "json" }).$type<unknown>(),
  bandFluency: real("band_fluency"),
  bandVocab: real("band_vocab"),
  bandGrammar: real("band_grammar"),
  bandPronunciation: real("band_pronunciation"),
  feedbackJson: text("feedback_json", { mode: "json" }).$type<unknown>(),
  audioPath: text("audio_path"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

// 错题本，独立于 words 的 FSRS 队列（听力/阅读/写作错题等）
export const mistakes = sqliteTable("mistakes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sourceType: text("source_type", {
    enum: ["vocab", "listening", "reading", "writing"],
  }).notNull(),
  payloadJson: text("payload_json", { mode: "json" }).$type<unknown>().notNull(),
  due: integer("due", { mode: "timestamp" }).notNull(),
  stability: real("stability").notNull(),
  difficulty: real("difficulty").notNull(),
  elapsedDays: real("elapsed_days").notNull(),
  scheduledDays: real("scheduled_days").notNull(),
  learningSteps: integer("learning_steps").notNull().default(0),
  reps: integer("reps").notNull(),
  lapses: integer("lapses").notNull(),
  state: integer("state").notNull(),
  lastReview: integer("last_review", { mode: "timestamp" }),
});

// 每日统计：XP / streak / 学习时长
export const userStats = sqliteTable("user_stats", {
  date: text("date").primaryKey(), // YYYY-MM-DD
  xp: integer("xp").notNull().default(0),
  streak: integer("streak").notNull().default(0),
  minutes: real("minutes").notNull().default(0),
});

// 通用 key-value 配置表，用于 UI 开关、默认 provider 等。
// value 存 JSON，读取时按 key 做类型断言。
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value", { mode: "json" }).$type<unknown>(),
});

// LLM provider 配置。id 是用户自定义别名（如 "ollama-local"）。
// capabilities 标记该 provider 能承担的任务类型：
//   - "light":    词汇干扰项、例句、听力脚本、阅读短文
//   - "grading":  写作/口语评分、口语追问
//   - "multimodal": 支持音频/图像输入（目前仅口语评分增强）
export const providers = sqliteTable("providers", {
  id: text("id").primaryKey(),
  type: text("type", { enum: ["ollama", "openai", "deepseek"] }).notNull(),
  name: text("name").notNull(),
  baseUrl: text("base_url"),
  apiKey: text("api_key"),
  model: text("model").notNull(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
  capabilities: text("capabilities", { mode: "json" }).$type<string[]>(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

// 本地语音/多模态模型元数据，记录用户启用的模型及用途。
// 实际模型文件由用户通过 Ollama 自行下载，这里只保存配置。
export const voiceModels = sqliteTable("voice_models", {
  id: text("id").primaryKey(), // 如 "ollama/gemma3:4b"
  providerId: text("provider_id").references(() => providers.id),
  purpose: text("purpose", { enum: ["multimodal_assess", "tts", "asr"] }),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(false),
});
