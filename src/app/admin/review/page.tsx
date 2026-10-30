import Link from "next/link";
import { authConfigured, isAdmin, signIn, signOut } from "@/auth";
import { database } from "@/lib/server/database";
import { Logo } from "@/components/ui";
import { TestDocumentUpload } from "@/components/test-document-upload";
export const dynamic = "force-dynamic";
export default async function Admin() {
  if (!authConfigured())
    return (
      <main className="container receipt">
        <Logo />
        <h1>Admin sign-in setup pending</h1>
        <p>
          Google OAuth credentials must be configured before access is enabled.
          Documents and applications are not publicly accessible.
        </p>
        <Link className="button primary" href="/admin">
          Open manager demo ↗
        </Link>
      </main>
    );
  if (!(await isAdmin()))
    return (
      <main className="container receipt">
        <Logo />
        <h1>Admin sign-in</h1>
        <p>Access is restricted to the approved FC Capital administrator.</p>
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/admin/review" });
          }}
        >
          <button className="button primary">Sign in with Google</button>
        </form>
      </main>
    );
  const db = await database();
  const apps = await db
    .collection("demo_applications")
    .find({})
    .sort({ created: -1 })
    .limit(50)
    .toArray();
  const docs = await db
    .collection("test_documents")
    .find({})
    .sort({ created: -1 })
    .limit(50)
    .toArray();
  return (
    <main className="container" style={{ padding: "48px 0" }}>
      <Logo />
      <h1>Test application review</h1>
      <p>Fictional data only. This is not a live client approval system.</p>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/admin" });
        }}
      >
        <button className="button secondary">Sign out</button>
      </form>
      <h2>Recent applications</h2>
      {apps.map((app) => (
        <details className="panel" key={String(app._id)}>
          <summary>
            {app.reference} · {app.account}
          </summary>
          <p>Email status: {app.emailStatus}</p>
          {(app.documentIds || []).map((id: string) => (
            <p key={id}>
              <a href={"/api/documents/" + id}>
                Download attached test document
              </a>
            </p>
          ))}
          <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
            {JSON.stringify(app.data, null, 2)}
          </pre>
        </details>
      ))}
      <h2>Private test documents</h2>
      <p>
        These test files are stored separately from applications. Downloads
        require admin authentication.
      </p>
      {docs.map((doc) => (
        <p key={String(doc._id)}>
          <a className="text-button" href={"/api/documents/" + doc._id}>
            {doc.kind} · {doc.size} bytes · Download
          </a>
        </p>
      ))}
      <TestDocumentUpload />
    </main>
  );
}
