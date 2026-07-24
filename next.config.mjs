/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['pg'],
  turbopack: {
    root: process.cwd(),
  },
}

export default nextConfig
