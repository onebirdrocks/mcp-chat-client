/** @type {import('next').NextConfig} */
const nextConfig = {
  // Exclude src directory from Next.js compilation to avoid conflicts with legacy Vite frontend
  webpack: (config, { isServer }) => {
    // Ignore src directory in watch mode only
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/src/**', '**/backend/**', '**/node_modules/**'],
    };
    
    return config;
  },
  async headers() {
    return [
      {
        // Apply CORS headers to all API routes
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: 'http://localhost:3000' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
        ],
      },
    ];
  },
};

export default nextConfig;