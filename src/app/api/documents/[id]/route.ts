import { get } from "@vercel/blob";
import { isAdmin } from "@/auth";
import { database } from "@/lib/server/database";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdmin())) return new Response(null, { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response(null, { status: 404 });
  const doc = await (await database())
    .collection<{ _id: string; pathname: string }>("test_documents")
    .findOne({ _id: id });
  if (!doc) return new Response(null, { status: 404 });
  const file = await get(doc.pathname, { access: "private", useCache: false });
  if (!file || file.statusCode !== 200)
    return new Response(null, { status: 404 });
  return new Response(file.stream, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition":
        'attachment; filename="test-document.' +
        doc.pathname.split(".").pop() +
        '"',
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
