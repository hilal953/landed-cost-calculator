/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/free.html',
        destination: '/free',
      },
      {
        source: '/pro.html',
        destination: '/pro',
      },
      {
        source: '/index.html',
        destination: '/',
      },
    ];
  },
};

export default nextConfig;
