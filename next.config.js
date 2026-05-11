/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
import('@opennextjs/cloudflare').then(m => m.initOpenNextCloudflareForDev());
