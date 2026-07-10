/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@nexus/shared", "@nexus/ui"],
  images: {
    domains: [
      "images.unsplash.com",
      "avatars.githubusercontent.com",
      "lh3.googleusercontent.com",
      "nexus-crm-uploads.s3.amazonaws.com",
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
};

module.exports = nextConfig;
