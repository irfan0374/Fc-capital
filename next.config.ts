import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  // The chat assistant reads its Markdown knowledge files at runtime.
  outputFileTracingIncludes: { "/api/chat": ["./knowledge/**/*.md"] },
};
export default nextConfig;
