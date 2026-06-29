/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    useCache: true,
    serverActions: {
      bodySizeLimit: "2mb"
    }
  }
};

export default nextConfig;
