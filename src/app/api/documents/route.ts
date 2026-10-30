import { head, get, del } from "@vercel/blob";
import { isAdmin, ADMIN } from "@/auth";
import { database } from "@/lib/server/database";
import { z } from "zod";
const schema = z
  .object({
    pathname: z
      .string()
      .regex(
        /^test-documents\/[0-9a-f-]{36}\/(identity|identityBack|addressProof)\.(pdf|jpg|png)$/,
      ),
    fictionalOnly: z.literal(true),
  })
  .strict();
export async function POST(request: Request) {
  if (!(await isAdmin())) return new Response(null, { status: 401 });
  if (
    new URL(request.headers.get("origin") || "https://invalid").host !==
    request.headers.get("host")
  )
    return new Response(null, { status: 403 });
  try {
    const text = await request.text();
    if (text.length > 2048) return new Response(null, { status: 413 });
    const { pathname } = schema.parse(JSON.parse(text));
    const meta = await head(pathname);
    const file = await get(pathname, { access: "private", useCache: false });
    if (!file || file.statusCode !== 200) throw new Error("Missing");
    const reader = file.stream.getReader();
    const first = await reader.read();
    await reader.cancel();
    const bytes = Buffer.from(first.value || []);
    const ext = pathname.split(".").pop();
    const valid =
      ext === "pdf"
        ? bytes.subarray(0, 5).toString() === "%PDF-"
        : ext === "png"
          ? bytes
              .subarray(0, 8)
              .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
          : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    if (!valid || meta.size > 5 * 1024 * 1024) {
      await del(pathname);
      return Response.json(
        { error: "File content or size is invalid." },
        { status: 400 },
      );
    }
    const id = pathname.split("/")[1];
    const kind = pathname.split("/")[2].split(".")[0];
    const docs = (await database()).collection<{
      _id: string;
      pathname: string;
      kind: string;
      owner: string;
      size: number;
      created: Date;
    }>("test_documents");
    await docs.updateOne(
      { _id: id },
      {
        $setOnInsert: {
          pathname,
          kind,
          owner: ADMIN,
          size: meta.size,
          created: new Date(),
        },
      },
      { upsert: true },
    );
    return Response.json({ id, kind });
  } catch {
    return Response.json(
      { error: "Could not confirm the test upload." },
      { status: 400 },
    );
  }
}
