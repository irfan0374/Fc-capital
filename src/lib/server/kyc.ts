import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { database } from "./database";
import { z } from "zod";
import { documentOptions, type KycKind, type KycStatus } from "@/lib/kyc";
export type KycFile = {
  pathname: string;
  contentType: string;
  size: number;
  created: Date;
};
export type KycSession = {
  _id: string;
  secret: string;
  created: Date;
  expires: Date;
  documentType: string;
  country: string;
  uploads: number;
  files: Partial<Record<KycKind, KycFile>>;
  applicationId?: string;
};
const hash = (secret: string) =>
  createHash("sha256").update(secret).digest("hex");
export const sessions = async () =>
  (await database()).collection<KycSession>("kyc_sessions");
export function newSecret() {
  const secret = randomBytes(24).toString("base64url");
  return { secret, hashed: hash(secret) };
}
export async function findSession(id: unknown, secret: unknown) {
  if (typeof id !== "string" || typeof secret !== "string") return null;
  if (!/^[0-9a-f-]{36}$/.test(id) || secret.length > 100) return null;
  const session = await (await sessions()).findOne({ _id: id });
  if (!session || session.expires < new Date()) return null;
  const a = Buffer.from(session.secret);
  const b = Buffer.from(hash(secret));
  return a.length === b.length && timingSafeEqual(a, b) ? session : null;
}
export const status = (s: KycSession): KycStatus => ({
  documentType: s.documentType,
  country: s.country,
  captured: Object.fromEntries(
    Object.keys(s.files).map((k) => [k, true]),
  ) as KycStatus["captured"],
});
export function sameOrigin(request: Request) {
  try {
    return (
      new URL(request.headers.get("origin") || "").host ===
      request.headers.get("host")
    );
  } catch {
    return false;
  }
}
export const reply = (body: object | null, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
export const kycInput = z
  .object({ documentType: z.string().max(40), country: z.string().max(80) })
  .strict()
  .refine((v) => documentOptions(v.country).includes(v.documentType));
