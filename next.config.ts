import type { NextConfig } from 'next';
import withSerwistInit from '@serwist/next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    const landingPageUrl = process.env.LANDING_PAGE_URL || "http://localhost:3001";
    return [
      {
        source: "/about",
        destination: `${landingPageUrl}/about`,
      },
      {
        source: "/about/:path*",
        destination: `${landingPageUrl}/about/:path*`,
      },
    ];
  },
  allowedDevOrigins: ['10.144.172.154'],
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // Allow access to remote image placeholder.
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**', // This allows any path under the hostname
      },
    ],
  },
  output: 'standalone',
  transpilePackages: ['motion'],
  webpack: (config, { dev }) => {
    // HMR is disabled in AI Studio via DISABLE_HMR env var.
    // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
    if (dev && process.env.DISABLE_HMR === 'true') {
      config.watchOptions = {
        ignored: /.*/,
      };
    }
    return config;
  },
};

const withSerwist = withSerwistInit({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
  // No aggressive front-end navigation caching (equivalent intent to the
  // old plugin's `cacheOnFrontEndNav: false` / `aggressiveFrontEndNavCaching: false`).
  cacheOnNavigation: false,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === 'development',
});

export default withSerwist(nextConfig);
