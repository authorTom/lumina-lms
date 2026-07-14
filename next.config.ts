import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a self-contained server bundle (.next/standalone) for a small
  // production Docker image. better-sqlite3 is a native module, so it's kept
  // external and traced rather than bundled.
  output: "standalone",
  serverExternalPackages: ["better-sqlite3"],
  experimental: {
    serverActions: {
      // SCORM packages are uploaded through a server action.
      bodySizeLimit: "200mb",
    },
  },
};

export default nextConfig;
