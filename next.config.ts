import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  async redirects() {
    return [
      {
        source: '/',
        destination: '/proyectos',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
