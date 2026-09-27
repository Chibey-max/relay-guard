/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  /**
   * Type safety for our OWN code is enforced via `npm run typecheck` (tsc).
   * We don't let a transitive dependency's internal .ts source (e.g. ox/tempo)
   * fail the production build, since those are outside our control.
   */
  typescript: { ignoreBuildErrors: true },
  // magic-sdk is browser-only; exclude from SSR bundle to prevent webpack ESM errors.
  experimental: {
    serverComponentsExternalPackages: ["magic-sdk", "@magic-sdk/provider"],
  },
  webpack: (config) => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    config.externals.push("pino-pretty", "lokijs", "encoding");
    return config;
  },
};
module.exports = nextConfig;
