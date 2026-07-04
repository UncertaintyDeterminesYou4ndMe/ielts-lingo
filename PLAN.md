# IELTS Lingo — 本地自用雅思学习应用 开发计划

> 一句话：复刻多邻国的游戏化学习体验，但内容和评分体系对准雅思（目标 6-6.5），
> 本地单用户运行，混合模型架构（本地跑语音/词汇，API 跑写作/口语评分）。
>
> 交互形态参考：https://ogden.munch.love （卡片式、双语、自动发音、深浅主题、键盘导航）——
> 本项目的词汇模块应达到同等的轻快手感。

## 0. 背景与第一性原理

- 用户：单人本地自用，中文母语，目标雅思 6-6.5，基础一般（核心词汇量 ~3000-4000 起步）。
- 多邻国的可复刻内核：**短课时关卡 + 即时反馈 + 间隔重复 + streak/XP 游戏化**。
- 雅思和多邻国的差异：雅思提分靠四项技能 + 官方评分标准（Band Descriptors），
  所以本项目 = 多邻国的"外壳"（游戏化、关卡、SRS） + 雅思的"内核"（四项技能训练、按官方四维评分）。
- 优先级（按投入产出比排序）：**词汇 > 写作批改 > 听力/阅读 > 口语陪练**。
  口语工程量最大（录音→ASR→对话→评分→TTS），放最后。

## 1. 技术栈（定死，不要发散）

> **实施状态（2026-07-03 更新）**：P0-P4 已全部实现并跑通，见 [`README.md`](./README.md) 的
> "已知限制" 一节。下表中 ASR/TTS 两行已从计划改为实际落地方案（原因见备注列），
> 其余保持计划原样。

| 层 | 选型 | 理由 |
|---|---|---|
| 应用 | Next.js 15 (App Router) + TypeScript + Tailwind | 用户已有多个 Next.js 项目，本地 `npm run dev` 即用 |
| 数据库 | SQLite（better-sqlite3 + Drizzle ORM） | 单用户本地，零运维，数据一个文件方便备份 |
| SRS 算法 | [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs)（FSRS-6，npm 装即用） | 不要手写 SM-2，FSRS 是当前最优开源调度算法 |
| 本地 LLM | Ollama + qwen3:8b（备选 qwen3:14b） | 词汇例句生成、干扰项生成、听力脚本生成等轻任务 |
| 云端 LLM | DeepSeek API（deepseek-chat） | 写作/口语评分需要大参数模型才准，月成本几块钱 |
| ASR | ~~whisper.cpp~~ → **`@huggingface/transformers`（transformers.js）+ ffmpeg 解码** | whisper.cpp 需要编译环境；transformers.js 纯 npm 安装即可跑 Whisper（WASM/ONNX 推理），ffmpeg 把浏览器任意录音格式统一转成 16kHz PCM 喂给它。实测 `whisper-base.en` 转写准确 |
| TTS | ~~edge-tts (Python)~~ → **`msedge-tts`（同一 Edge TTS 服务的纯 JS 实现）** | 效果和账号体系与 edge-tts 完全一致（英/美/澳口音），但不需要额外装 Python，跟 Next.js 技术栈更统一 |
| 音频录制 | 浏览器 MediaRecorder API | 无需原生应用 |

**模型调用统一走一个 `lib/llm.ts` 适配层**：`complete(task, prompt)`，按 task 路由到
Ollama 或 DeepSeek，config 里可切换。这样评分质量不满意时随时换模型，不动业务代码。

## 2. 数据源（全部开源/免费，先落库再开发功能）

| 数据 | 来源 | 用途 |
|---|---|---|
| 雅思词表 | [kajweb/dict](https://github.com/kajweb/dict)（IELTS 词书 JSON，含音标/释义/例句） | 词汇模块主词库 |
| 中英词典 | [ECDICT](https://github.com/skywind3000/ECDICT)（CSV，含柯林斯星级/牛津3000/考试标签） | 补充释义、词频分级、点查 |
| 词根记忆 | [sxwang1991/ielts-word-list](https://github.com/sxwang1991/ielts-word-list) | 词卡上的助记内容（可选） |
| 听力/阅读素材 | LLM 生成（见 5.4）+ 用户自备剑桥真题 PDF/音频导入 | 真题有版权，**不要内置**，做导入功能 |
| 写作/口语题库 | 公开的历年考题 prompt 列表（GitHub 上多个仓库有汇总，实施时挑一个），存成种子 JSON | 出题 |

**数据导入脚本**放 `scripts/seed/`，跑一次生成 `data/app.db`。词汇按 ECDICT
词频/柯林斯星级切成 5 个难度带（对应关卡地图的章节）。

## 3. 产品形态（多邻国式外壳）

- **首页 = 关卡路径图**：纵向蜿蜒的节点路径，按单元（Unit）分组，完成解锁下一个。
  单元主题按雅思高频场景组织（租房、学术讲座、环境、科技、健康…），同一单元内
  词汇课和技能课交替出现。
- **游戏化**：每日目标（XP）、连胜 streak、每课结束的结算页（XP + 正确率 + 连击）、
  错题自动进入 FSRS 复习队列。**不做**：好友/排行榜/内购（单用户无意义）。
- **每日复习入口**：FSRS 到期卡片数角标，复习优先于新课（多邻国没做好的地方，我们做对）。
- UI 双语（中文界面 + 英文内容）、深浅主题、全键盘可操作（1-4 选项、Enter 提交、Space 发音）。

## 4. 数据模型（核心表）

```
words(id, headword, phonetic_uk, phonetic_us, pos, meaning_cn, example, band_level, unit_id)
cards(id, word_id, fsrs_state...)          -- ts-fsrs 的 Card 字段直接平铺
units(id, title, theme, order)             -- 关卡地图章节
lessons(id, unit_id, type[vocab|listening|reading|writing|speaking], order, content_json)
attempts(id, lesson_id, started_at, score, detail_json)   -- 每次练习记录
essays(id, task_type[T1|T2], prompt, body, band_overall, band_tr, band_cc, band_lr, band_gra, feedback_json, created_at)
speaking_sessions(id, part, transcript_json, band_*, feedback_json, audio_path, created_at)
mistakes(id, source_type, payload_json, fsrs_state...)     -- 错题本，也走 FSRS
user_stats(date, xp, streak, minutes)
```

## 5. 模块设计

### 5.1 词汇（多邻国式刷词）— 核心模块

题型（一节课 ~15 题，混合出）：
1. 词卡认知：看词选中文释义（四选一，干扰项用同难度带近义词，LLM 预生成缓存）
2. 反向：看中文选英文
3. 听音拼写：edge-tts 发音 → 键盘输入拼写（qwerty-learner 式，带渐进提示）
4. 例句填空：例句挖掉目标词，四选一
5. 同义替换配对：雅思听阅核心技能，词 ↔ 同义表达连线

FSRS 集成：每题的对/错映射为 Rating（Again/Hard/Good/Easy 简化为 Again/Good），
课后统一 `fsrs.repeat()` 更新。**例句和干扰项在 seed 阶段用 Ollama 批量预生成**，
运行时不实时调 LLM，保证刷词零延迟。

### 5.2 写作批改

- Task 1（小作文，图表描述——图表用 SVG/Chart 渲染题库里的数据）+ Task 2（大作文）。
- 编辑器：字数统计、计时器（20/40 分钟）、可暂存草稿。
- 评分：DeepSeek，prompt 内嵌**官方 Band Descriptors 四维标准**（TR/CC/LR/GRA），
  输出严格 JSON：四维分 + 总分 + 逐段问题 + 3 条最重要的改进点 + 升级版范文段落。
- 逐句 diff 视图：原句 → 修改后句子，高亮改动，点击看原因。
- 历史 essays 列表 + 分数趋势图。低分维度的问题（如某类语法错误）摘要进错题本。

### 5.3 口语陪练（最后做）

- Part 1/2/3 完整流程：TTS 播报考官问题 → MediaRecorder 录音 → whisper 转写 →
  DeepSeek 扮演考官追问（Part 3 动态追问）→ session 结束后整体评分。
- 评分四维：流利度/词汇/语法/发音。发音只做粗评（基于 whisper 置信度 + 明显错读），
  诚实标注"发音分仅供参考"。
- Part 2 带 1 分钟准备计时 + 2 分钟作答计时。
- 转写和音频都留档，可回放对比。

### 5.4 听力/阅读

- **听力（生成式，解决素材版权问题）**：LLM 按雅思 Section 1-4 模板生成对话/独白脚本
  （含填空/选择题及答案），edge-tts 用两个不同口音音色分角色合成对话音频。
  题型：表格填空、单选、地图题（先不做地图，P3 再说）。
- **阅读**：LLM 基于种子话题生成 300-500 词学术短文 + T/F/NG、段落信息匹配、摘要填空。
  6-6.5 目标下生成质量完全够用；生成内容缓存入库，人工可标记"烂题"剔除。
- **真题导入**（可选增强）：用户放入剑桥真题 PDF/音频，解析出题目做成练习。P4 再做。
- 所有错题进 `mistakes` 表，FSRS 调度重做。

## 6. 开发阶段（每阶段可独立验收，按此顺序执行）

### P0 — 脚手架 + 数据落库（~2 天）
- Next.js + Drizzle + SQLite 初始化；`lib/llm.ts` 适配层（Ollama + DeepSeek 双通道）。
- seed 脚本：拉 kajweb/dict 雅思词书 + ECDICT，清洗、分难度带、切 Unit，落库。
- **验收**：`npm run seed && npm run dev` 能看到 Unit 列表和词表数据。

### P1 — 词汇 MVP（~1 周）⭐ 先跑起来每天能用
- 关卡地图、5 种词汇题型、课程结算页、FSRS 复习队列、每日目标/streak、edge-tts 发音。
- 干扰项/例句预生成脚本（Ollama）。
- **验收**：完整学完一个 Unit，第二天打开有到期复习卡片，streak +1。

### P2 — 写作批改（~1 周）
- 题库种子、编辑器、DeepSeek 评分链路、逐句修改视图、历史与趋势。
- **验收**：写一篇 Task 2，得到四维分数和逐句反馈，historic 页面能看到记录。

### P3 — 听力/阅读（~1 周）
- 听力生成管线（脚本→TTS→题目）、阅读生成管线、播放器（可 0.8x/回看原文）、错题本。
- **验收**：完成一套生成的听力 Section 1 + 一篇阅读，错题出现在复习队列。

### P4 — 口语陪练 + 收尾（~1-2 周）
- whisper.cpp 集成、录音组件、Part 1/2/3 流程、考官对话、评分。
- 统计总览页（四项练习时长/分数趋势）、真题导入（可选）。
- **验收**：完成一次 Part 1 对话拿到评分和转写回放。

## 7. 风险与对策

- **LLM 评分不稳定** → 评分 prompt 里放 2 个 few-shot 标定样例（一篇 5.5、一篇 6.5），
  温度 0，输出 JSON schema 校验失败自动重试。
- **生成的听阅题质量参差** → 每题带"报告烂题"按钮，标记后不再出现；生成时同一 prompt
  先生成再让模型自检一遍答案一致性。
- **edge-tts 依赖网络** → 听力音频生成后缓存为本地 mp3；纯离线场景退回 Piper。
- **口语延迟**（录音→转写→回复）→ whisper 用 medium 以下模型，转写期间 UI 显示考官"思考中"。

## 8. 明确不做

- 多用户/登录/云同步/部署（本地 `npm run dev` 或 `npm start` 即可）
- 好友、排行榜、内购等社交游戏化
- 内置任何有版权的真题内容
- 精确发音打分（需要专门的 pronunciation assessment 模型，超出范围）
