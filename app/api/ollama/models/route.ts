import { listLocalModels } from "@/lib/ollama-utils";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const host = new URL(request.url).searchParams.get("host") ?? "http://localhost:11434";
  const models = await listLocalModels(host);
  return Response.json({ models });
}
