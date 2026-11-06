"use server";
import { AuthError } from "next-auth";
import { isAdmin, signIn, signOut } from "@/auth";
import { database } from "@/lib/server/database";
import { reviewStatuses, type ReviewStatus } from "@/lib/admin-workspace";
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
