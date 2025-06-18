/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXTAUTH_SECRET: 'classroom_app_secret_key',
    NEXTAUTH_URL: 'http://localhost:3000',
  },
}

module.exports = nextConfig