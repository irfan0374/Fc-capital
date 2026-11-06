import { del, put } from "@vercel/blob";
import {
  findSession,
  reply,
  sameOrigin,
  sessions,
  status,
} from "@/lib/server/kyc";
import { MAX_KYC_BYTES, kycKinds, type KycKind } from "@/lib/kyc";
export const runtime = "nodejs";
const types: Record<string, { ext: string; magic: (b: Buffer) => boolean }> = {
  "image/jpeg": {
    ext: "jpg",
    magic: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  "image/png": {
    ext: "png",
    magic: (b) =>
      b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
  },
  "application/pdf": {
    ext: "pdf",
    magic: (b) => b.subarray(0, 5).toString() === "%PDF-",
  },
};
export async function POST(request: Request) {
  if (!sameOrigin(request)) return reply({ error: "Invalid origin." }, 403);
  const kind = new URL(request.url).searchParams.get("kind") as KycKind;
  if (!kycKinds.includes(kind)) return reply({ error: "Invalid file." }, 400);
  const contentType = (request.headers.get("content-type") || "").split(";")[0];
  const type = types[contentType];
  if (!type || (kind !== "addressProof" && contentType !== "image/jpeg"))
    return reply({ error: "Unsupported file type." }, 415);
  if (Number(request.headers.get("content-length") || 0) > MAX_KYC_BYTES)
    return reply({ error: "File is larger than 4 MB." }, 413);
  try {
    const session = await findSession(
      request.headers.get("x-kyc-id"),
      request.headers.get("x-kyc-secret"),
    );
    if (!session || session.applicationId)
      return reply({ error: "Verification link expired." }, 404);
    if (session.uploads >= 30)
      return reply({ error: "Too many attempts. Please restart." }, 429);
    const reader = request.body?.getReader();
    if (!reader) return reply({ error: "Missing file." }, 400);
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.length;
      if (bytes > MAX_KYC_BYTES) {
        await reader.cancel();
        return reply({ error: "File is larger than 4 MB." }, 413);
      }
      chunks.push(value);
    }
    const body = Buffer.concat(chunks);
    if (!type.magic(body))
      return reply({ error: "File content is invalid." }, 400);
    const blob = await put(`kyc/${session._id}/${kind}.${type.ext}`, body, {
      access: "private",
      contentType,
      addRandomSuffix: true,
    });
    const old = session.files[kind]?.pathname;
    const file = {
      pathname: blob.pathname,
      contentType,
      size: bytes,
      created: new Date(),
    };
    await (
      await sessions()
    ).updateOne(
      { _id: session._id },
      { $set: { ["files." + kind]: file }, $inc: { uploads: 1 } },
    );
    if (old) await del(old).catch(() => {});
    return reply(
      status({ ...session, files: { ...session.files, [kind]: file } }),
    );
  } catch {
    return reply({ error: "Upload failed. Please try again." }, 503);
  }
}
