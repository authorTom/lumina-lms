import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  experimental: {
    serverActions: {
      // SCORM packages are uploaded through a server action.
      bodySizeLimit: "200mb",
    },
  },
};

export default nextConfig;
