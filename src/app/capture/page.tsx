import type { Metadata } from "next";
import { CapturePage } from "@/components/kyc/capture-page";
export const metadata: Metadata = {
  title: "Verify your identity · FC Capital",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};
export default function Page() {
  return <CapturePage />;
}
