/** @type {import('next').NextConfig} */
const nextConfig = {
    typescript: {
          ignoreBuildErrors: true,
    },
    eslint: {
          ignoreDuringBuilds: true,
    },
    images: {
          domains: ['scontent-iad3-1.cdninstagram.com', 'scontent.cdninstagram.com', 'cdn.cdninstagram.com'],
    },
}

module.exports = nextConfig
