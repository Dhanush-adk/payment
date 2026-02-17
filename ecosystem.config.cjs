/**
 * PM2 ecosystem file – use on EC2: pm2 start ecosystem.config.cjs
 * Requires: npm install -g pm2
 */
module.exports = {
  apps: [
    {
      name: 'payment-api',
      script: 'src/server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '400M',
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],
};
