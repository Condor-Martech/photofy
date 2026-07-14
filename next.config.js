/** @type {import('next').NextConfig} */
const nextConfig = {
  // Exigido pelo Dockerfile multi-stage (COPY .next/standalone) e por PHF-094.
  output: "standalone",
};

module.exports = nextConfig;
