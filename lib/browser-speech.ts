// 客户端专用：用浏览器内置 Web Speech API 朗读文本，零后端依赖。
export function speak(text: string, lang: string = "en-US") {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = lang;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
}
