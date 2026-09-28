/** @type {import('next').NextConfig} */
const backendApiUrl = (process.env.BACKEND_API_URL || 'http://127.0.0.1:8000').trim().replace(/\/$/, '')

const nextConfig = {
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendApiUrl}/api/:path*`,
      },
    ]
  },
}

export default nextConfig

