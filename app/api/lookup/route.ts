import { lookupWord } from "@/lib/dictionary-lookup";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const word = new URL(request.url).searchParams.get("word") ?? "";
  if (!word.trim()) {
    return Response.json({ found: false }, { status: 400 });
  }
  const result = lookupWord(word);
  if (!result) {
    return Response.json({ found: false, query: word });
  }
  return Response.json({ found: true, ...result });
}
