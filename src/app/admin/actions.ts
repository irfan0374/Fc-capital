"use server";
import { AuthError } from "next-auth";
import { isAdmin, signIn, signOut } from "@/auth";
import { database } from "@/lib/server/database";
import {
  reviewStatuses,
  type DocReview,
  type ReviewStatus,
} from "@/lib/admin-workspace";
import { kycKinds, kycLabels, type KycKind } from "@/lib/kyc";
import type { KycSession } from "@/lib/server/kyc";
type StoredApp = {
  _id: string;
  kycSessionId?: string;
  reviews?: Partial<Record<string, DocReview>>;
};
const apps = async () =>
  (await database()).collection<StoredApp>("demo_applications");
export async function login(_state: string, form: FormData) {
  try {
    await signIn("credentials", {
      email: form.get("email"),
      password: form.get("password"),
      redirectTo: "/admin",
    });
    return "";
  } catch (e) {
    if (e instanceof AuthError) return "Incorrect email or password.";
    throw e;
  }
}
export async function loginWithGoogle() {
  await signIn("google", { redirectTo: "/admin" });
}
export async function logout() {
  await signOut({ redirectTo: "/admin/login" });
}
export async function updateApplication(
  id: string,
  change: { status?: ReviewStatus; note?: string },
) {
  if (!(await isAdmin())) throw new Error("Unauthorized");
  if (!/^[0-9a-f-]{36}$/.test(id)) throw new Error("Invalid application");
  const set: Record<string, string> = {};
  const push: Record<string, string> = {};
  if (change.status) {
    if (!reviewStatuses.includes(change.status))
      throw new Error("Invalid status");
    if (change.status === "Approved") {
      const app = await (await apps()).findOne({ _id: id });
      if (!app) throw new Error("Application not found");
      if (app.kycSessionId) {
        const session = await (
          await database()
        )
          .collection<KycSession>("kyc_sessions")
          .findOne({ _id: app.kycSessionId }, { projection: { files: 1 } });
        const pending = Object.keys(session?.files || {}).filter(
          (k) => app.reviews?.[k]?.status !== "Approved",
        );
        if (pending.length) throw new Error("Approve all documents first");
      }
    }
    set.status = change.status;
    push.history = "Administrator changed status to " + change.status;
  }
  const note = change.note?.trim().slice(0, 1000);
  if (note) push.notes = note;
  await (
    await database()
  )
    .collection<{ _id: string }>("demo_applications")
    .updateOne({ _id: id }, { $set: set, $push: push });
}
export async function reviewDocument(
  id: string,
  kind: KycKind,
  review: DocReview,
) {
  if (!(await isAdmin())) throw new Error("Unauthorized");
  if (!/^[0-9a-f-]{36}$/.test(id)) throw new Error("Invalid application");
  if (!kycKinds.includes(kind)) throw new Error("Invalid document");
  if (!["Approved", "Rejected"].includes(review.status))
    throw new Error("Invalid status");
  const reason =
    review.status === "Rejected"
      ? String(review.reason || "")
          .trim()
          .slice(0, 300)
      : "";
  if (review.status === "Rejected" && !reason) throw new Error("Add a reason");
  const value: DocReview = reason
    ? { status: review.status, reason }
    : { status: review.status };
  await (
    await apps()
  ).updateOne(
    { _id: id },
    {
      $set: { ["reviews." + kind]: value },
      $push: {
        history:
          kycLabels[kind] +
          " " +
          review.status.toLowerCase() +
          (reason ? ": " + reason : ""),
      } as never,
    },
  );
}
