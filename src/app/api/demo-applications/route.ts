import { isAdmin, ADMIN } from "@/auth";
import { Resend } from "resend";
import { database } from "@/lib/server/database";
import { empty, schemaFor, type Application } from "@/lib/demo";
import { z } from "zod";
export const runtime = "nodejs";
const input = z
  .object({
    id: z.string().uuid(),
    data: z.record(z.string(), z.unknown()),
    documents: z.array(z.string().uuid()).max(3).default([]),
  })
  .strict();
function clean(raw: Record<string, unknown>) {
  const data = { ...empty };
  for (const key of Object.keys(empty) as (keyof Application)[]) {
    const value = raw[key];
    if (typeof value === "string")
      Object.assign(data, { [key]: value.trim().slice(0, 500) });
    else if (typeof value === "boolean" && typeof empty[key] === "boolean")
      Object.assign(data, { [key]: value });
  }
  data.code = "";
  for (let step = 0; step < 8; step++)
    if (step !== 1 && !schemaFor(step, data).safeParse(data).success)
      return null;
  return data;
}
const reply = (body: object, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
export async function POST(request: Request) {
  let origin: URL;
  try {
    origin = new URL(request.headers.get("origin") || "");
  } catch {
    return reply({ error: "Invalid request origin." }, 403);
  }
  if (
    !["http:", "https:"].includes(origin.protocol) ||
    origin.host !== request.headers.get("host")
  )
    return reply({ error: "Invalid request origin." }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return reply({ error: "JSON required." }, 415);
  const reader = request.body?.getReader();
  if (!reader) return reply({ error: "Missing request." }, 400);
  let bytes = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.length;
    if (bytes > 16384) {
      await reader.cancel();
      return reply({ error: "Request too large." }, 413);
    }
    chunks.push(value);
  }
  let parsed;
  try {
    parsed = input.safeParse(JSON.parse(Buffer.concat(chunks).toString()));
  } catch {
    return reply({ error: "Invalid JSON." }, 400);
  }
  const data = parsed.success ? clean(parsed.data.data) : null;
  if (!parsed.success || !data)
    return reply(
      { error: "Some application details are missing or invalid." },
      400,
    );
  const { id, documents } = parsed.data;
  const account = data.account;
  if (documents.length && !(await isAdmin()))
    return reply(
      { error: "Admin sign-in required to attach test documents." },
      401,
    );
  try {
    const db = await database();
    if (documents.length) {
      const count = await db
        .collection<{ _id: string; owner: string }>("test_documents")
        .countDocuments({ _id: { $in: documents }, owner: ADMIN });
      if (count !== documents.length)
        return reply({ error: "Invalid test documents." }, 400);
    }
    const apps = db.collection<{
      _id: string;
      reference: string;
      created: Date;
      account: string;
      emailStatus: string;
      data: Application;
      status: string;
      notes: string[];
      history: string[];
      emailId?: string;
      documentIds?: string[];
    }>("demo_applications");
    const existing = await apps.findOne({ _id: id });
    if (existing)
      return reply({
        reference: existing.reference,
        created: existing.created,
        account: existing.account,
        emailStatus: existing.emailStatus,
      });
    const day = new Date().toISOString().slice(0, 10);
    const limit = await db
      .collection<{ _id: string; count: number }>("submission_limits")
      .findOneAndUpdate(
        { _id: day },
        { $inc: { count: 1 } },
        { upsert: true, returnDocument: "after" },
      );
    if ((limit?.count ?? 0) > 200)
      return reply(
        { error: "Too many applications today. Please try again tomorrow." },
        429,
      );
    const reference = "FC-" + id.slice(0, 8).toUpperCase();
    const created = new Date();
    try {
      await apps.insertOne({
        _id: id,
        reference,
        created,
        account,
        emailStatus: "pending",
        documentIds: documents,
        status: "Pending review",
        notes: [],
        history: ["Application received"],
        data,
      });
    } catch (e) {
      if ((e as { code?: number }).code !== 11000) throw e;
      return reply({ reference, created, account, emailStatus: "pending" });
    }
    let emailStatus = "unavailable";
    let emailId: string | undefined;
    if (process.env.RESEND_API_KEY) {
      try {
        const result = await new Resend(process.env.RESEND_API_KEY).emails.send(
          {
            from: "FC Capital <onboarding@resend.dev>",
            to: [ADMIN],
            subject: `New application · ${data.firstName} ${data.lastName} · ${reference}`,
            text: `New application received.\n\nReference: ${reference}\nName: ${data.firstName} ${data.lastName}\nEmail: ${data.email}\nPhone: ${data.phone}\nCountry: ${data.country}\nAccount: ${account}\n\nReview it at https://fc-capital.vercel.app/admin (admin sign-in required).`,
          },
          { idempotencyKey: "fc-app/" + id },
        );
        emailStatus = result.error ? "failed" : "accepted";
        emailId = result.data?.id;
      } catch {
        emailStatus = "unknown";
      }
    }
    await apps.updateOne(
      { _id: id },
      { $set: { emailStatus, ...(emailId ? { emailId } : {}) } },
    );
    return reply({ reference, created, account, emailStatus }, 201);
  } catch {
    return reply(
      {
        error: "We could not save your application. Please try again.",
      },
      503,
    );
  }
}
