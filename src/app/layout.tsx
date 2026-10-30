import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "FC Capital · A clearer perspective",
  description: "FC Capital interactive website and onboarding demo.",
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
