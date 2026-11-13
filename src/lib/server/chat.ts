import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { database } from "./database";
const API = "https://generativelanguage.googleapis.com/v1beta/models/";
const EMBED_MODEL = "gemini-embedding-001";
const DIMENSIONS = 768;
export const chatModel = () => process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
export const chatConfigured = () => !!process.env.GEMINI_API_KEY;
export type ChatMessage = { role: "user" | "assistant"; content: string };
export const chatInput = z
  .object({
    messages: z
      .array(
        z
          .object({
            role: z.enum(["user", "assistant"]),
            content: z.string().trim().min(1).max(2000),
          })
          .strict(),
      )
      .min(1)
      .max(30),
  })
  .strict()
  .refine((v) => v.messages.at(-1)?.role === "user");
type Chunk = { id: string; title: string; heading: string; text: string };
const state = globalThis as typeof globalThis & {
  fcKnowledge?: Promise<Chunk[]>;
  fcVectors?: Map<string, number[]>;
};
const sha = (text: string) => createHash("sha256").update(text).digest("hex");
// Each "## " section of a knowledge file is one searchable chunk.
async function loadKnowledge() {
  const dir = path.join(process.cwd(), "knowledge");
  const files = (await readdir(dir)).filter(
    (f) => f.endsWith(".md") && f !== "README.md",
  );
  const chunks: Chunk[] = [];
  for (const file of files.sort()) {
    const source = await readFile(path.join(dir, file), "utf8");
    const title = source.match(/^# (.+)$/m)?.[1].trim() || file;
    for (const part of source.split(/^## /m).slice(1)) {
      const [heading, ...body] = part.split("\n");
      const text = body.join("\n").trim();
      if (text)
        chunks.push({
          id: sha(file + heading + text),
          title,
          heading: heading.trim(),
          text,
        });
    }
  }
  return chunks;
}
const knowledge = () => {
  state.fcKnowledge ??= loadKnowledge().catch((e) => {
    delete state.fcKnowledge;
    throw e;
  });
  return state.fcKnowledge;
};
const stop = new Set(
  "a an and are as at be but by can do does for from how i if in is it its me my of on or so that the this to was what when where which who why will with you your".split(
    " ",
  ),
);
const words = (text: string) =>
  text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 1 && !stop.has(w));
// BM25 keyword score; headings count twice because they phrase the question.
function keywordScores(chunks: Chunk[], query: string) {
  const docs = chunks.map((c) =>
    words(c.heading + " " + c.heading + " " + c.text),
  );
  const avg = docs.reduce((n, d) => n + d.length, 0) / docs.length;
  const terms = [...new Set(words(query))];
  return docs.map((doc) =>
    terms.reduce((score, term) => {
      const tf = doc.filter((w) => w === term).length;
      if (!tf) return score;
      const df = docs.filter((d) => d.includes(term)).length;
      const idf = Math.log(1 + (docs.length - df + 0.5) / (df + 0.5));
      return score + (idf * tf * 2.2) / (tf + 1.2 * (0.25 + 0.75 * (doc.length / avg)));
    }, 0),
  );
}
async function embed(
  texts: { text: string; title?: string }[],
  task: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY",
) {
  const response = await fetch(API + EMBED_MODEL + ":batchEmbedContents", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": process.env.GEMINI_API_KEY || "",
    },
    body: JSON.stringify({
      requests: texts.map((t) => ({
        model: "models/" + EMBED_MODEL,
        content: { parts: [{ text: t.text }] },
        taskType: task,
        outputDimensionality: DIMENSIONS,
        ...(t.title ? { title: t.title } : {}),
      })),
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error("Embedding failed: " + response.status);
  const body = (await response.json()) as { embeddings: { values: number[] }[] };
  return body.embeddings.map((e) => e.values);
}
// Chunk vectors are cached in memory and in MongoDB, keyed by content hash,
// so only new or edited sections are embedded again.
async function chunkVectors(chunks: Chunk[]) {
  const cache = (state.fcVectors ??= new Map());
  let missing = chunks.filter((c) => !cache.has(c.id));
  if (!missing.length) return cache;
  const collection = (await database()).collection<{
    _id: string;
    vector: number[];
  }>("chat_embeddings");
  for (const row of await collection
    .find({ _id: { $in: missing.map((c) => c.id) } })
    .toArray())
    cache.set(row._id, row.vector);
  missing = missing.filter((c) => !cache.has(c.id));
  for (let i = 0; i < missing.length; i += 100) {
    const batch = missing.slice(i, i + 100);
    const vectors = await embed(
      batch.map((c) => ({ text: c.heading + "\n" + c.text, title: c.title })),
      "RETRIEVAL_DOCUMENT",
    );
    batch.forEach((c, n) => cache.set(c.id, vectors[n]));
    await collection.bulkWrite(
      batch.map((c, n) => ({
        replaceOne: {
          filter: { _id: c.id },
          replacement: { vector: vectors[n] },
          upsert: true,
        },
      })),
    );
  }
  return cache;
}
const cosine = (a: number[], b: number[]) => {
  let dot = 0,
    na = 0,
    nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na * nb) || 1);
};
// Hybrid search: meaning (embeddings) plus exact words (BM25). Falls back to
// keywords alone if the embedding API is unavailable.
export async function retrieve(query: string, limit = 5) {
  const chunks = await knowledge();
  const keywords = keywordScores(chunks, query);
  const top = Math.max(...keywords) || 1;
  let scores = keywords.map((k) => k / top);
  try {
    const [vectors, [q]] = await Promise.all([
      chunkVectors(chunks),
      embed([{ text: query }], "RETRIEVAL_QUERY"),
    ]);
    scores = chunks.map(
      (c, i) => 0.75 * cosine(q, vectors.get(c.id)!) + 0.25 * scores[i],
    );
  } catch (e) {
    console.error("Chat retrieval is using keywords only:", e);
  }
  return chunks
    .map((chunk, i) => ({ chunk, score: scores[i] }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.chunk);
}
export const systemPrompt = (context: Chunk[]) => `You are the FC Capital assistant, a friendly chat assistant on the FC Capital website. FC Capital is an online trading brand offering forex, index and commodity CFDs on MetaTrader 5.

How to answer:
- For anything about FC Capital (company, accounts, pricing, regulation, platform, opening an account, documents, contact), use ONLY the knowledge below. If the answer is not there, or it is "to be confirmed", say it is not confirmed yet and that the FC Capital team can help. Never invent fees, leverage, licences, contact details or timelines.
- For general trading education (forex, CFDs, leverage, margin, orders, charts, risk), use the knowledge below first, and you may add widely accepted general explanations.
- Never give personal investment advice, trading signals, price predictions, or tell someone to buy, sell or hold anything. Politely say you can't, explain the relevant concept and its risks instead, and suggest speaking to the FC Capital team or an independent adviser.
- When you talk about leverage, CFDs or trading strategies, briefly remind the user that CFDs carry a high risk of losing money rapidly due to leverage.
- Politely decline questions unrelated to trading or FC Capital.
- Reply in the same language as the user's latest message; if unsure, use English. Be clear and concise: short paragraphs, bullet points for steps or lists, **bold** for key terms. No headings and no tables.
- Never ask for or repeat passwords, card numbers, ID numbers or other sensitive personal data.

Knowledge:
${context.map((c) => `### ${c.title} — ${c.heading}\n${c.text}`).join("\n\n")}`;
// Streams only the visible answer text from Gemini's server-sent events.
export async function* streamAnswer(messages: ChatMessage[], context: Chunk[]) {
  const response = await fetch(
    API + chatModel() + ":streamGenerateContent?alt=sse",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY || "",
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt(context) }] },
        contents: messages.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
        generationConfig: { temperature: 0.3, maxOutputTokens: 2048 },
      }),
      signal: AbortSignal.timeout(60000),
    },
  );
  if (!response.ok || !response.body) {
    console.error("Gemini error", response.status, await response.text());
    throw new Error(response.status === 429 ? "busy" : "failed");
  }
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const event = JSON.parse(line.slice(5)) as {
        candidates?: {
          content?: { parts?: { text?: string; thought?: boolean }[] };
        }[];
      };
      for (const part of event.candidates?.[0]?.content?.parts || [])
        if (part.text && !part.thought) yield part.text;
    }
  }
}
export const hashIp = (ip: string) => sha("chat-ip:" + ip).slice(0, 24);
