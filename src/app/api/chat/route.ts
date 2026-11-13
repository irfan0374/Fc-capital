import { database } from "@/lib/server/database";
import { reply, sameOrigin } from "@/lib/server/kyc";
import {
  chatConfigured,
  chatInput,
  hashIp,
  retrieve,
  streamAnswer,
} from "@/lib/server/chat";
export const runtime = "nodejs";
export const maxDuration = 60;
const DAILY_PER_VISITOR = 60;
const DAILY_TOTAL = 1000;
async function overLimit(request: Request) {
  try {
    const day = new Date().toISOString().slice(0, 10);
    const ip = (request.headers.get("x-forwarded-for") || "local")
      .split(",")[0]
      .trim();
    const limits = (await database()).collection<{
      _id: string;
      count: number;
    }>("submission_limits");
    const bump = (id: string) =>
      limits.findOneAndUpdate(
        { _id: id },
        { $inc: { count: 1 } },
        { upsert: true, returnDocument: "after" },
      );
    const [visitor, total] = await Promise.all([
      bump("chat:" + day + ":" + hashIp(ip)),
      bump("chat:" + day),
    ]);
    return (
      (visitor?.count ?? 0) > DAILY_PER_VISITOR ||
      (total?.count ?? 0) > DAILY_TOTAL
    );
  } catch {
    return false;
  }
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return reply({ error: "Invalid origin." }, 403);
  if (!chatConfigured())
    return reply({ error: "The assistant is not available yet." }, 503);
  let parsed;
  try {
    parsed = chatInput.safeParse(
      JSON.parse((await request.text()).slice(0, 40000)),
    );
  } catch {
    return reply({ error: "Invalid request." }, 400);
  }
  if (!parsed.success) return reply({ error: "Invalid message." }, 400);
  if (await overLimit(request))
    return reply(
      { error: "You've reached today's message limit. Please try tomorrow." },
      429,
    );
  const messages = parsed.data.messages.slice(-10);
  // Recent user turns give follow-ups ("and the Raw one?") enough context.
  const query = messages
    .filter((m) => m.role === "user")
    .slice(-2)
    .map((m) => m.content)
    .join("\n");
  let context;
  try {
    context = await retrieve(query);
  } catch {
    return reply({ error: "The assistant is unavailable right now." }, 503);
  }
  const answer = streamAnswer(messages, context);
  let first;
  try {
    first = await answer.next();
  } catch (e) {
    return reply(
      {
        error:
          (e as Error).message === "busy"
            ? "The assistant is busy. Please try again in a minute."
            : "The assistant is unavailable right now.",
      },
      503,
    );
  }
  const encoder = new TextEncoder();
  const body = new ReadableStream({
    async start(controller) {
      try {
        if (!first.done) controller.enqueue(encoder.encode(first.value));
        for await (const text of answer) controller.enqueue(encoder.encode(text));
      } catch {
        controller.enqueue(
          encoder.encode("\n\n_Sorry, the answer was interrupted._"),
        );
      }
      controller.close();
    },
  });
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Chat-Sources": encodeURIComponent(
        JSON.stringify([...new Set(context.slice(0, 3).map((c) => c.title))]),
      ),
    },
  });
}
