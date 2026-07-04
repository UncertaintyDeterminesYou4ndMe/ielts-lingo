import { pipeline, type AutomaticSpeechRecognitionPipeline } from "@huggingface/transformers";
import { spawn } from "node:child_process";

// 本地 Whisper（transformers.js，纯 JS/WASM 推理，无需编译 whisper.cpp）。
// 浏览器录音格式五花八门（webm/opus 等），先用 ffmpeg 统一解码成 16kHz 单声道 PCM。
const MODEL = "Xenova/whisper-base.en";

let transcriberPromise: Promise<AutomaticSpeechRecognitionPipeline> | null = null;

function getTranscriber(): Promise<AutomaticSpeechRecognitionPipeline> {
  if (!transcriberPromise) {
    transcriberPromise = pipeline("automatic-speech-recognition", MODEL) as Promise<AutomaticSpeechRecognitionPipeline>;
  }
  return transcriberPromise;
}

function decodeToPcm(inputBuffer: Buffer): Promise<Float32Array> {
  return new Promise((resolve, reject) => {
    const ffmpegPath = process.env.FFMPEG_PATH || "ffmpeg";
    const ffmpeg = spawn(ffmpegPath, ["-i", "pipe:0", "-f", "f32le", "-ac", "1", "-ar", "16000", "pipe:1"]);
    const chunks: Buffer[] = [];
    let stderr = "";

    ffmpeg.stdout.on("data", (c: Buffer) => chunks.push(c));
    ffmpeg.stderr.on("data", (c: Buffer) => {
      stderr += c.toString();
    });
    ffmpeg.on("error", (err) => {
      reject(new Error(`未找到 ffmpeg，请先安装或在环境变量 FFMPEG_PATH 中指定路径：${err.message}`));
    });
    ffmpeg.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`ffmpeg 解码音频失败：${stderr.slice(-500)}`));
        return;
      }
      const buf = Buffer.concat(chunks);
      const floatArray = new Float32Array(buf.length / 4);
      for (let i = 0; i < floatArray.length; i++) {
        floatArray[i] = buf.readFloatLE(i * 4);
      }
      resolve(floatArray);
    });

    ffmpeg.stdin.write(inputBuffer);
    ffmpeg.stdin.end();
  });
}

/** 把任意格式的音频 Buffer 转写成英文文本。 */
export async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  const pcm = await decodeToPcm(audioBuffer);
  const transcriber = await getTranscriber();
  const result = await transcriber(pcm);
  const first = Array.isArray(result) ? result[0] : result;
  return (first?.text ?? "").trim();
}
