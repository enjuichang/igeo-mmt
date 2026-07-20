import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The repository also contains Cloudflare Worker infrastructure. Native
  // Next.js builds (including Netlify) type-check only the Next application.
  typescript: {
    tsconfigPath: "tsconfig.netlify.json",
  },
};

export default nextConfig;
