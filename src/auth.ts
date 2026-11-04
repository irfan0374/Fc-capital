import { timingSafeEqual } from "node:crypto";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
export const ADMIN = "irfanfinisso@gmail.com";
export const googleConfigured = () =>
  !!(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
export const authConfigured = () =>
  !!(
    process.env.AUTH_SECRET &&
    (process.env.ADMIN_PASSWORD || googleConfigured())
  );
function same(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (input) => {
        const password = process.env.ADMIN_PASSWORD;
        const email = String(input?.email || "")
          .trim()
          .toLowerCase();
        if (!password || email !== ADMIN) return null;
        return same(String(input?.password || ""), password)
          ? { id: "admin", email: ADMIN, name: "Administrator" }
          : null;
      },
    }),
    ...(googleConfigured() ? [Google] : []),
  ],
  session: { strategy: "jwt", maxAge: 8 * 3600 },
  pages: { signIn: "/admin/login" },
  callbacks: {
    signIn: async ({ account, profile, user }) =>
      account?.provider === "credentials"
        ? user.email === ADMIN
        : account?.provider === "google" &&
          profile?.email_verified === true &&
          profile.email?.toLowerCase() === ADMIN,
  },
});
export async function isAdmin() {
  if (!authConfigured()) return false;
  const session = await auth();
  return session?.user?.email?.toLowerCase() === ADMIN;
}
