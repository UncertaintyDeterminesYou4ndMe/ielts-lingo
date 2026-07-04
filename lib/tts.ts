import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

// 免费的 Edge TTS 服务，覆盖英/美/澳三种口音，供听力素材配音。
export const VOICES = {
  us: "en-US-AriaNeural",
  gb: "en-GB-RyanNeural",
  au: "en-AU-NatashaNeural",
  usMale: "en-US-GuyNeural",
} as const;

async function synthesizeToBuffer(text: string, voice: string): Promise<Buffer> {
  const tts = new MsEdgeTTS();
  await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "ielts-tts-"));
  const { audioFilePath } = await tts.toFile(tmpDir, text);
  const buf = await readFile(audioFilePath);
  tts.close();
  return buf;
}

/** 把多段（可能不同说话人/口音）文本依次合成并拼接成一个 mp3 文件。 */
export async function synthesizeScriptToFile(
  turns: { voice: string; text: string }[],
  outPath: string
): Promise<void> {
  const buffers: Buffer[] = [];
  for (const turn of turns) {
    buffers.push(await synthesizeToBuffer(turn.text, turn.voice));
  }
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, Buffer.concat(buffers));
}

export async function synthesizeSingleToFile(text: string, voice: string, outPath: string): Promise<void> {
  const buf = await synthesizeToBuffer(text, voice);
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, buf);
}
