import {
  getProviders,
  getProvider,
  createProvider,
  updateProvider,
  deleteProvider,
  type ProviderType,
} from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const providers = await getProviders();
  return Response.json({ providers });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      id: string;
      type: ProviderType;
      name: string;
      baseUrl?: string;
      apiKey?: string;
      model: string;
      enabled?: boolean;
      isDefault?: boolean;
      capabilities?: string[];
    };

    const error = validateProvider(body);
    if (error) {
      return Response.json({ error }, { status: 400 });
    }

    const existing = await getProvider(body.id);
    const provider = existing
      ? await updateProvider(body.id, body)
      : await createProvider(body);

    return Response.json({ provider });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "保存 provider 失败" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return Response.json({ error: "缺少 id" }, { status: 400 });
  }
  const ok = await deleteProvider(id);
  if (!ok) {
    return Response.json({ error: "provider 不存在" }, { status: 404 });
  }
  return Response.json({ ok: true });
}

function validateProvider(body: {
  id?: string;
  type?: ProviderType;
  name?: string;
  model?: string;
  baseUrl?: string;
  apiKey?: string;
}): string | undefined {
  if (!body.id || !/^[a-z0-9_-]+$/i.test(body.id)) {
    return "id 只能包含字母、数字、下划线和连字符";
  }
  if (!body.type || !["ollama", "openai", "deepseek"].includes(body.type)) {
    return "type 必须是 ollama / openai / deepseek 之一";
  }
  if (!body.name || body.name.trim().length === 0) {
    return "名称不能为空";
  }
  if (!body.model || body.model.trim().length === 0) {
    return "模型名不能为空";
  }
  if (body.type !== "ollama" && (!body.apiKey || body.apiKey.trim().length === 0)) {
    return "API Key 不能为空";
  }
  return undefined;
}
