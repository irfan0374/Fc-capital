import type { Metadata } from "next";
import "./globals.css";
import { ChatWidget } from "@/components/chat/chat-widget";
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
      <body>
        {children}
        <ChatWidget />
      </body>
    </html>
  );
}
