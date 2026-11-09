import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // firebase-admin používa Node API (gRPC, fs), nesmie sa baliť do klientskeho bundlu.
  serverExternalPackages: ['firebase-admin'],
};

export default nextConfig;
