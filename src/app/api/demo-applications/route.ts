import { isAdmin, ADMIN } from "@/auth";
import { Resend } from "resend";
import { database } from "@/lib/server/database";
import { empty, sample } from "@/lib/demo";
import { z } from "zod";
export const runtime = "nodejs";
const input = z
  .object({
    id: z.string().uuid(),
    fictionalOnly: z.literal(true),
    account: z.enum(["Standard", "Raw"]),
    documents: z.array(z.string().uuid()).max(3).default([]),
  })
  .strict();
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
    if (bytes > 2048) {
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
  if (!parsed.success)
    return reply(
      { error: "Only fictional demo submissions are accepted." },
      400,
    );
  const { id, account, documents } = parsed.data;
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
      data: object;
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
    const limits = db.collection<{ _id: string }>("demo_submission_limits");
    let admitted = false;
    const day = new Date().toISOString().slice(0, 10);
    for (let i = 0; i < 10; i++) {
      try {
        await limits.insertOne({ _id: day + ":" + i });
        admitted = true;
        break;
      } catch (e) {
        if ((e as { code?: number }).code !== 11000) throw e;
      }
    }
    if (!admitted)
      return reply(
        { error: "Daily demo limit reached. Please try tomorrow." },
        429,
      );
    const reference = "TEST-" + id.toUpperCase();
    const created = new Date();
    try {
      await apps.insertOne({
        _id: id,
        reference,
        created,
        account,
        emailStatus: "pending",
        documentIds: documents,
        data: {
          ...empty,
          ...sample,
          account,
          code: "",
          testOnly: true,
          verification: "simulated",
          documents: "simulated",
        },
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
            from: "FC Capital Demo <onboarding@resend.dev>",
            to: ["irfanfinisso@gmail.com"],
            subject: "[TEST ONLY] FC Capital application received",
            text: `Fictional application saved. Reference: ${reference}. Applicant: Alex Morgan (fictional). Account: ${account}. No real client application or verification. Review test data at https://fc-capital.vercel.app/admin/review (admin sign-in required). CRM is separate. No email is sent to the fictional applicant.`,
          },
          { idempotencyKey: "fc-demo/" + id },
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
        error:
          "Unable to confirm saving the test application. Please retry with the same submission.",
      },
      503,
    );
  }
}
