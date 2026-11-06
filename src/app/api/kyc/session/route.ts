import { randomUUID } from "node:crypto";
import { database } from "@/lib/server/database";
import {
  kycInput,
  newSecret,
  reply,
  sameOrigin,
  sessions,
  status,
} from "@/lib/server/kyc";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!sameOrigin(request)) return reply({ error: "Invalid origin." }, 403);
  let parsed;
  try {
    parsed = kycInput.safeParse(
      JSON.parse((await request.text()).slice(0, 1024)),
    );
  } catch {
    return reply({ error: "Invalid request." }, 400);
  }
  if (!parsed.success) return reply({ error: "Invalid document type." }, 400);
  try {
    const day = new Date().toISOString().slice(0, 10);
    const limit = await (
      await database()
    )
      .collection<{ _id: string; count: number }>("submission_limits")
      .findOneAndUpdate(
        { _id: "kyc:" + day },
        { $inc: { count: 1 } },
        { upsert: true, returnDocument: "after" },
      );
    if ((limit?.count ?? 0) > 1000)
      return reply({ error: "Too many requests today." }, 429);
    const id = randomUUID();
    const { secret, hashed } = newSecret();
    const created = new Date();
    const session = {
      _id: id,
      secret: hashed,
      created,
      expires: new Date(created.getTime() + 24 * 3600 * 1000),
      documentType: parsed.data.documentType,
      country: parsed.data.country,
      uploads: 0,
      files: {},
    };
    await (await sessions()).insertOne(session);
    return reply({ id, secret, ...status(session) }, 201);
  } catch {
    return reply({ error: "Could not start verification." }, 503);
  }
}
