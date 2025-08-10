/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable TypeScript checking during build for now
  typescript: {
    ignoreBuildErrors: true,
  },
  // Exclude src directory from Next.js compilation to avoid conflicts with legacy Vite frontend
  webpack: (config, { isServer }) => {
    // Ignore src directory in watch mode only
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/src/**', '**/backend/**', '**/node_modules/**'],
    };
    
    return config;
  },
  // Note: i18n configuration is not supported in App Router
  // We handle internationalization client-side with react-i18next
  async headers() {
    return [
      {
        // Apply CORS headers to all API routes
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: 'http://localhost:3000' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
          { key: 'Access-Control-Allow-Credentials', value: 'Content-Type, Authorization, Accept-Language' },
        ],
      },
    ];
  },
};

export default nextConfig;