import { get } from "@vercel/blob";
import { isAdmin } from "@/auth";
import { sessions } from "@/lib/server/kyc";
import { kycKinds, type KycKind } from "@/lib/kyc";
export const runtime = "nodejs";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; kind: string }> },
) {
  if (!(await isAdmin())) return new Response(null, { status: 401 });
  const { id, kind } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id) || !kycKinds.includes(kind as KycKind))
    return new Response(null, { status: 404 });
  const file = (await (await sessions()).findOne({ _id: id }))?.files[
    kind as KycKind
  ];
  if (!file) return new Response(null, { status: 404 });
  const blob = await get(file.pathname, { access: "private", useCache: false });
  if (!blob || blob.statusCode !== 200)
    return new Response(null, { status: 404 });
  return new Response(blob.stream, {
    headers: {
      "Content-Type": file.contentType,
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy":
        "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'",
    },
  });
}
