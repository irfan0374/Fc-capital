import { del } from "@vercel/blob";
import {
  findSession,
  kycInput,
  reply,
  sameOrigin,
  sessions,
  status,
} from "@/lib/server/kyc";
export const runtime = "nodejs";
type Params = { params: Promise<{ id: string }> };
export async function GET(request: Request, { params }: Params) {
  const session = await findSession(
    (await params).id,
    request.headers.get("x-kyc-secret"),
  ).catch(() => null);
  if (!session) return reply({ error: "Verification link expired." }, 404);
  return reply(status(session));
}
export async function PATCH(request: Request, { params }: Params) {
  if (!sameOrigin(request)) return reply({ error: "Invalid origin." }, 403);
  const session = await findSession(
    (await params).id,
    request.headers.get("x-kyc-secret"),
  ).catch(() => null);
  if (!session || session.applicationId)
    return reply({ error: "Verification link expired." }, 404);
  let parsed;
  try {
    parsed = kycInput.safeParse(
      JSON.parse((await request.text()).slice(0, 1024)),
    );
  } catch {
    return reply({ error: "Invalid request." }, 400);
  }
  if (!parsed.success) return reply({ error: "Invalid document type." }, 400);
  const { documentType, country } = parsed.data;
  if (documentType === session.documentType && country === session.country)
    return reply(status(session));
  const files = { ...session.files };
  const stale =
    documentType !== session.documentType ? (["front", "back"] as const) : [];
  const old = stale.flatMap((k) => (files[k] ? [files[k].pathname] : []));
  for (const k of stale) delete files[k];
  if (old.length) await del(old).catch(() => {});
  await (
    await sessions()
  ).updateOne({ _id: session._id }, { $set: { documentType, country, files } });
  return reply(status({ ...session, documentType, country, files }));
}
