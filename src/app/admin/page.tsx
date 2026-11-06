import { redirect } from "next/navigation";
import { isAdmin } from "@/auth";
import { AdminDashboard } from "@/components/admin/dashboard";
import { database } from "@/lib/server/database";
import {
  demoApplications,
  reviewStatuses,
  type ReviewApplication,
  type ReviewStatus,
} from "@/lib/admin-workspace";
import type { Application } from "@/lib/demo";
import { kycKinds, kycLabels } from "@/lib/kyc";
import type { KycSession } from "@/lib/server/kyc";
export const dynamic = "force-dynamic";
type Stored = {
  _id: string;
  reference: string;
  created: Date;
  account: string;
  data?: Partial<Application>;
  status?: string;
  notes?: string[];
  history?: string[];
  documentIds?: string[];
  kycSessionId?: string;
  reviews?: ReviewApplication["reviews"];
};
async function load(): Promise<{ rows: ReviewApplication[]; error: string }> {
  try {
    const db = await database();
    const apps = await db
      .collection<Stored>("demo_applications")
      .find({})
      .sort({ created: -1 })
      .limit(500)
      .toArray();
    const ids = apps.flatMap((a) => a.documentIds || []);
    const docs = ids.length
      ? await db
          .collection<{ _id: string; kind: string }>("test_documents")
          .find({ _id: { $in: ids } })
          .toArray()
      : [];
    const kinds = new Map(docs.map((d) => [d._id, d.kind]));
    const kycIds = apps.flatMap((a) =>
      a.kycSessionId ? [a.kycSessionId] : [],
    );
    const kyc = new Map(
      (kycIds.length
        ? await db
            .collection<KycSession>("kyc_sessions")
            .find({ _id: { $in: kycIds } }, { projection: { files: 1 } })
            .toArray()
        : []
      ).map((k) => [k._id, k.files]),
    );
    return {
      error: "",
      rows: apps.map((a) => {
        const data = a.data || {};
        return {
          id: a._id,
          reference: a.reference,
          name:
            [data.firstName, data.lastName].filter(Boolean).join(" ") ||
            "Unnamed applicant",
          email: data.email || "",
          country: data.country || "",
          account: a.account,
          submitted: new Date(a.created).toISOString().slice(0, 10),
          status: reviewStatuses.includes(a.status as ReviewStatus)
            ? (a.status as ReviewStatus)
            : "Pending review",
          notes: a.notes || [],
          history: a.history || ["Application received"],
          demo: false,
          data,
          documents: [
            ...kycKinds.flatMap((kind) => {
              const file = a.kycSessionId && kyc.get(a.kycSessionId)?.[kind];
              return file
                ? [
                    {
                      id: kind,
                      kind: kycLabels[kind],
                      href: `/api/kyc/file/${a.kycSessionId}/${kind}`,
                      image: file.contentType.startsWith("image/"),
                      reviewable: true,
                    },
                  ]
                : [];
            }),
            ...(a.documentIds || []).map((id) => ({
              id,
              kind: kinds.get(id) || "document",
              href: "/api/documents/" + id,
              image: false,
              reviewable: false,
            })),
          ],
          reviews: a.reviews || {},
        };
      }),
    };
  } catch {
    return {
      rows: [],
      error: "Could not load applications from the database.",
    };
  }
}
export default async function Page() {
  if (!(await isAdmin())) redirect("/admin/login");
  const { rows, error } = await load();
  return (
    <AdminDashboard initial={[...rows, ...demoApplications]} error={error} />
  );
}
