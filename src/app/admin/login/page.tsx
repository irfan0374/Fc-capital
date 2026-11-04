import { redirect } from "next/navigation";
import { googleConfigured, isAdmin } from "@/auth";
import { AdminLogin } from "@/components/admin/login";
export const dynamic = "force-dynamic";
export default async function Page() {
  if (await isAdmin()) redirect("/admin");
  return <AdminLogin google={googleConfigured()} />;
}
