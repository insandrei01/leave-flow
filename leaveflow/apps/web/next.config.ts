import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Transpile workspace packages so Next.js can process their TypeScript
   * source directly without a separate build step during development.
   */
  transpilePackages: ["@leaveflow/constants"],

  /**
   * Strict mode enables additional React development warnings.
   */
  reactStrictMode: true,

  /**
   * Do not expose the X-Powered-By header.
   */
  poweredByHeader: false,
};

export default nextConfig;
