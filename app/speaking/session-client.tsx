"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { SpeakingTopic } from "@/lib/speaking-topics";
import { speak } from "@/lib/browser-speech";
import { MicIcon, StopIcon } from "@/app/components/icons";
import {
  generatePart3Questions,
  gradeSpeakingSession,
  transcribeTurn,
  type SpeakingTranscript,
} from "./actions";

type Stage =
  | { kind: "intro" }
  | { kind: "part1"; index: number }
  | { kind: "part2-prep"; secondsLeft: number }
  | { kind: "part2-speak" }
  | { kind: "part3-loading" }
  | { kind: "part3"; index: number; questions: string[] }
  | { kind: "grading" }
  | { kind: "error"; message: string };

const PART2_PREP_SECONDS = 60;

function useRecorder() {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  async function start() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    chunksRef.current = [];
    const recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    mediaRecorderRef.current = recorder;
    recorder.start();
    setIsRecording(true);
  }

  function stop(): Promise<Blob> {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder) {
        resolve(new Blob());
        return;
      }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        streamRef.current?.getTracks().forEach((t) => t.stop());
        setIsRecording(false);
        resolve(blob);
      };
      recorder.stop();
    });
  }

  return { start, stop, isRecording };
}

async function transcribeBlob(blob: Blob): Promise<string> {
  const formData = new FormData();
  formData.append("audio", blob, "answer.webm");
  const { text } = await transcribeTurn(formData);
  return text;
}

export default function SpeakingSession({ topic }: { topic: SpeakingTopic }) {
  const [stage, setStage] = useState<Stage>({ kind: "intro" });
  const [part1Answers, setPart1Answers] = useState<{ question: string; answer: string }[]>([]);
  const [part2Answer, setPart2Answer] = useState("");
  const [part3Answers, setPart3Answers] = useState<{ question: string; answer: string }[]>([]);
  const [liveText, setLiveText] = useState("");
  const recorder = useRecorder();
  const router = useRouter();
  const autoStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (autoStopTimerRef.current) clearTimeout(autoStopTimerRef.current);
    };
  }, []);

  function startPart1() {
    setStage({ kind: "part1", index: 0 });
    speak(topic.part1Questions[0]);
  }

  async function finishRecordingAndAdvance(question: string, onAnswer: (text: string) => void, next: () => void) {
    setLiveText("转写中...");
    const blob = await recorder.stop();
    const text = await transcribeBlob(blob);
    setLiveText("");
    onAnswer(text);
    next();
  }

  async function handlePart1Stop() {
    if (stage.kind !== "part1") return;
    const question = topic.part1Questions[stage.index];
    await finishRecordingAndAdvance(
      question,
      (text) => setPart1Answers((a) => [...a, { question, answer: text }]),
      () => {
        const next = stage.index + 1;
        if (next < topic.part1Questions.length) {
          setStage({ kind: "part1", index: next });
          speak(topic.part1Questions[next]);
        } else {
          setStage({ kind: "part2-prep", secondsLeft: PART2_PREP_SECONDS });
        }
      }
    );
  }

  // Part 2 准备倒计时
  useEffect(() => {
    if (stage.kind !== "part2-prep") return;
    const secondsLeft = stage.secondsLeft;
    const t = setTimeout(() => {
      if (secondsLeft <= 1) {
        setStage({ kind: "part2-speak" });
      } else {
        setStage({ kind: "part2-prep", secondsLeft: secondsLeft - 1 });
      }
    }, 1000);
    return () => clearTimeout(t);
  }, [stage]);

  // Part 2 开始说话自动录音 + 2分钟自动截止
  useEffect(() => {
    if (stage.kind !== "part2-speak") return;
    let cancelled = false;
    recorder.start().then(() => {
      if (cancelled) return;
      autoStopTimerRef.current = setTimeout(() => handlePart2Stop(), 120_000);
    });
    return () => {
      cancelled = true;
      if (autoStopTimerRef.current) clearTimeout(autoStopTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage.kind]);

  async function handlePart2Stop() {
    if (autoStopTimerRef.current) clearTimeout(autoStopTimerRef.current);
    setLiveText("转写中...");
    const blob = await recorder.stop();
    const text = await transcribeBlob(blob);
    setLiveText("");
    setPart2Answer(text);
    setStage({ kind: "part3-loading" });
    try {
      const questions = await generatePart3Questions(topic.id, text);
      setStage({ kind: "part3", index: 0, questions });
      speak(questions[0]);
    } catch (e) {
      setStage({ kind: "error", message: e instanceof Error ? e.message : "生成 Part 3 问题失败" });
    }
  }

  async function handlePart3Stop() {
    if (stage.kind !== "part3") return;
    const { questions, index } = stage;
    const question = questions[index];
    await finishRecordingAndAdvance(
      question,
      (text) => setPart3Answers((a) => [...a, { question, answer: text }]),
      () => {
        const next = index + 1;
        if (next < questions.length) {
          setStage({ kind: "part3", index: next, questions });
          speak(questions[next]);
        } else {
          finishSession();
        }
      }
    );
  }

  async function finishSession() {
    setStage({ kind: "grading" });
    const transcript: SpeakingTranscript = {
      part1: part1Answers,
      part2: { cueCard: topic.part2.cueCard, answer: part2Answer },
      part3: part3Answers,
    };
    try {
      const { id } = await gradeSpeakingSession(topic.id, transcript);
      router.push(`/speaking/sessions/${id}`);
    } catch (e) {
      setStage({ kind: "error", message: e instanceof Error ? e.message : "评分失败" });
    }
  }

  if (stage.kind === "intro") {
    return (
      <div className="text-center">
        <h1 className="text-xl font-semibold">{topic.title}</h1>
        <p className="mt-3 text-zinc-600 dark:text-zinc-400">
          完整模拟 Part 1（3题）→ Part 2（1分钟准备+2分钟陈述）→ Part 3（AI 追问 3 题），
          需要浏览器麦克风权限。
        </p>
        <button
          onClick={startPart1}
          className="mt-6 rounded-full bg-emerald-600 px-8 py-3 font-medium text-white hover:bg-emerald-700"
        >
          开始
        </button>
      </div>
    );
  }

  if (stage.kind === "error") {
    return <p className="text-center text-rose-600">{stage.message}</p>;
  }

  if (stage.kind === "grading" || stage.kind === "part3-loading") {
    return (
      <p className="text-center text-zinc-500">
        {stage.kind === "grading" ? "AI 正在评分..." : "正在生成 Part 3 追问..."}
      </p>
    );
  }

  if (stage.kind === "part1") {
    const question = topic.part1Questions[stage.index];
    return (
      <div className="text-center">
        <p className="text-sm text-zinc-500">Part 1 · 第 {stage.index + 1}/{topic.part1Questions.length} 题</p>
        <p className="mt-3 text-2xl font-medium">{question}</p>
        <RecordControls recorder={recorder} onStop={handlePart1Stop} liveText={liveText} />
      </div>
    );
  }

  if (stage.kind === "part2-prep") {
    return (
      <div className="text-center">
        <p className="text-sm text-zinc-500">Part 2 · 准备时间</p>
        <p className="mt-3 text-xl font-medium">{topic.part2.cueCard}</p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-left text-zinc-600 dark:text-zinc-400">
          {topic.part2.bulletPoints.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
        <p className="mt-6 font-mono text-3xl">{stage.secondsLeft}s</p>
      </div>
    );
  }

  if (stage.kind === "part2-speak") {
    return (
      <div className="text-center">
        <p className="text-sm text-zinc-500">Part 2 · 陈述中（最长 2 分钟，可提前停止）</p>
        <p className="mt-3 text-xl font-medium">{topic.part2.cueCard}</p>
        <RecordControls recorder={recorder} onStop={handlePart2Stop} liveText={liveText} autoStarted />
      </div>
    );
  }

  // part3
  const question = stage.questions[stage.index];
  return (
    <div className="text-center">
      <p className="text-sm text-zinc-500">
        Part 3 · 第 {stage.index + 1}/{stage.questions.length} 题
      </p>
      <p className="mt-3 text-2xl font-medium">{question}</p>
      <RecordControls recorder={recorder} onStop={handlePart3Stop} liveText={liveText} />
    </div>
  );
}

function RecordControls({
  recorder,
  onStop,
  liveText,
  autoStarted,
}: {
  recorder: ReturnType<typeof useRecorder>;
  onStop: () => void;
  liveText: string;
  autoStarted?: boolean;
}) {
  if (liveText) {
    return <p className="mt-6 text-zinc-500">{liveText}</p>;
  }
  if (!recorder.isRecording && !autoStarted) {
    return (
      <button
        onClick={() => recorder.start()}
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-rose-600 px-6 py-3 font-medium text-white transition-transform active:scale-[0.98] hover:bg-rose-700"
      >
        <MicIcon className="text-lg" />
        开始录音
      </button>
    );
  }
  return (
    <button
      onClick={onStop}
      className="mt-6 inline-flex items-center gap-2 rounded-full bg-rose-600 px-6 py-3 font-medium text-white transition-transform active:scale-[0.98]"
    >
      <span className="flex h-2.5 w-2.5 animate-pulse rounded-full bg-white" />
      <StopIcon className="text-lg" />
      停止并提交
    </button>
  );
}
