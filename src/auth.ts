import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
export const ADMIN = "irfanfinisso@gmail.com";
export const authConfigured = () =>
  !!(
    process.env.AUTH_GOOGLE_ID &&
    process.env.AUTH_GOOGLE_SECRET &&
    process.env.AUTH_SECRET
  );
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: "jwt", maxAge: 3600 },
  callbacks: {
    signIn: async ({ account, profile }) =>
      account?.provider === "google" &&
      profile?.email_verified === true &&
      profile.email?.toLowerCase() === ADMIN,
  },
});
export async function isAdmin() {
  if (!authConfigured()) return false;
  const session = await auth();
  return session?.user?.email?.toLowerCase() === ADMIN;
}
