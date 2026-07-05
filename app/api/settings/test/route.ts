import type { ProviderType } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      type: ProviderType;
      baseUrl?: string;
      apiKey?: string;
      model: string;
    };

    const start = Date.now();

    if (body.type === "ollama") {
      const host = (body.baseUrl ?? "http://localhost:11434").replace(/\/$/, "");
      const res = await fetch(`${host}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: body.model,
          prompt: "hi",
          stream: false,
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) {
        const text = await res.text();
        return Response.json({ ok: false, error: `${res.status} ${text}` });
      }
      return Response.json({ ok: true, latencyMs: Date.now() - start });
    }

    // openai / deepseek
    if (!body.apiKey) {
      return Response.json({ ok: false, error: "缺少 API Key" });
    }
    const baseUrl = (body.baseUrl ?? "https://api.deepseek.com").replace(/\/$/, "");
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${body.apiKey}`,
      },
      body: JSON.stringify({
        model: body.model,
        messages: [{ role: "user", content: "hi" }],
        max_tokens: 5,
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      const text = await res.text();
      return Response.json({ ok: false, error: `${res.status} ${text}` });
    }
    return Response.json({ ok: true, latencyMs: Date.now() - start });
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : "测试失败" },
      { status: 500 }
    );
  }
}
