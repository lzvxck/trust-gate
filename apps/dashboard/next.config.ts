import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Not `output: 'standalone'`: the self-hosted docker-compose image runs a plain
  // `next build` + `next start` (see apps/dashboard/Dockerfile) because the standalone
  // bundle only traces files reachable from Next's route graph, which excludes the
  // db:migrate script run on container start.
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'avatars.githubusercontent.com' }],
  },
};

export default nextConfig;
