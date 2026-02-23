/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  eslint: {
    // Disable ESLint during production builds (Vercel handles this separately)
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Disable TypeScript type checking during builds (speeds up deployment)
    ignoreBuildErrors: false,
  },
};

module.exports = nextConfig;
