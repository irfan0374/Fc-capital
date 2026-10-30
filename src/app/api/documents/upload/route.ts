import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { isAdmin } from "@/auth";
export async function POST(request: Request) {
  try {
    if (Number(request.headers.get("content-length") || 0) > 16384)
      return new Response(null, { status: 413 });
    const text = await request.text();
    if (text.length > 16384) return new Response(null, { status: 413 });
    const body = JSON.parse(text) as HandleUploadBody;
    const result = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname) => {
        if (!(await isAdmin())) throw new Error("Unauthorized");
        if (
          new URL(request.headers.get("origin") || "").host !==
          request.headers.get("host")
        )
          throw new Error("Origin");
        if (
          !/^test-documents\/[0-9a-f-]{36}\/(identity|identityBack|addressProof)\.(pdf|jpg|png)$/.test(
            pathname,
          )
        )
          throw new Error("Path");
        return {
          allowedContentTypes: ["application/pdf", "image/jpeg", "image/png"],
          maximumSizeInBytes: 5 * 1024 * 1024,
          validUntil: Date.now() + 300000,
          addRandomSuffix: false,
          allowOverwrite: false,
        };
      },
    });
    return Response.json(result);
  } catch {
    return Response.json(
      {
        error:
          "Upload unavailable. Sign in as the approved admin and use a supported test file.",
      },
      { status: 403 },
    );
  }
}
