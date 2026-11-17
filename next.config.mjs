/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", "prisma", "node-cron"],
    instrumentationHook: true,
  },
};

export default nextConfig;
