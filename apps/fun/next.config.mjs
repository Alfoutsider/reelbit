/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  // On Vercel the project root is the repo root, so output .next there
  // so Vercel's Next.js framework builder can find it.
  distDir: process.env.VERCEL ? "../../.next" : ".next",
};

export default nextConfig;
