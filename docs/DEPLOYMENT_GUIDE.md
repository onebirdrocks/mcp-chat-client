# MCP Chat UI - Deployment Guide

## Overview

This guide covers various deployment options for the MCP Chat UI application, from local development to production deployment using Docker, cloud services, and traditional hosting.

## Prerequisites

- Node.js 18+ installed
- Docker and Docker Compose (for containerized deployment)
- Git for version control
- Basic understanding of web application deployment

## Deployment Options

### 1. Local Development Deployment

**Quick Start:**
```bash
# Clone the repository
git clone <repository-url>
cd mcp-chat-ui

# Set up environment
./scripts/deploy.sh dev

# Start development server
npm run dev
```

**Manual Setup:**
```bash
# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env.local

# Edit .env.local with your configuration
# Add your API keys and settings

# Create data directories
mkdir -p data/sessions data/settings config

# Start the application
npm run dev
```

The application will be available at http://localhost:3000

### 2. Production Build (Local)

```bash
# Build for production
npm run deploy:build

# Start production server
npm run start:production
```

### 3. Docker Deployment

**Single Container:**
```bash
# Build Docker image
docker build -t mcp-chat-ui .

# Run container
docker run -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/config:/app/config \
  -e NODE_ENV=production \
  mcp-chat-ui
```

**Docker Compose (Recommended):**
```bash
# Start with Docker Compose
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

**Docker Compose with Nginx:**
```bash
# Start with reverse proxy
docker-compose --profile production up -d
```

### 4. Cloud Deployment

#### Vercel Deployment

1. **Prepare for Vercel:**
```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login
```

2. **Configure vercel.json:**
```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  },
  "functions": {
    "app/api/**/*.ts": {
      "runtime": "nodejs18.x"
    }
  }
}
```

3. **Deploy:**
```bash
# Deploy to Vercel
vercel --prod
```

#### Railway Deployment

1. **Create railway.json:**
```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/api/health"
  }
}
```

2. **Deploy:**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway link
railway up
```

#### DigitalOcean App Platform

1. **Create .do/app.yaml:**
```yaml
name: mcp-chat-ui
services:
- name: web
  source_dir: /
  github:
    repo: your-username/mcp-chat-ui
    branch: main
  run_command: npm start
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs
  http_port: 3000
  health_check:
    http_path: /api/health
  envs:
  - key: NODE_ENV
    value: production
```

2. **Deploy via CLI:**
```bash
# Install doctl
# Follow DigitalOcean documentation

# Create app
doctl apps create .do/app.yaml

# Update app
doctl apps update <app-id> .do/app.yaml
```

### 5. VPS/Server Deployment

#### Using PM2 (Process Manager)

1. **Install PM2:**
```bash
npm install -g pm2
```

2. **Create ecosystem.config.js:**
```javascript
module.exports = {
  apps: [{
    name: 'mcp-chat-ui',
    script: 'npm',
    args: 'start',
    cwd: '/path/to/mcp-chat-ui',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    instances: 'max',
    exec_mode: 'cluster',
    watch: false,
    max_memory_restart: '1G',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

3. **Deploy:**
```bash
# Build the application
npm run build:production

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup
pm2 startup
```

#### Using Systemd Service

1. **Create service file:**
```bash
sudo nano /etc/systemd/system/mcp-chat-ui.service
```

```ini
[Unit]
Description=MCP Chat UI
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/mcp-chat-ui
ExecStart=/usr/bin/npm start
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
```

2. **Enable and start:**
```bash
sudo systemctl daemon-reload
sudo systemctl enable mcp-chat-ui
sudo systemctl start mcp-chat-ui
sudo systemctl status mcp-chat-ui
```

### 6. Nginx Reverse Proxy Setup

1. **Install Nginx:**
```bash
sudo apt update
sudo apt install nginx
```

2. **Create site configuration:**
```bash
sudo nano /etc/nginx/sites-available/mcp-chat-ui
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Static files
    location /_next/static/ {
        proxy_pass http://localhost:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Health check
    location /api/health {
        proxy_pass http://localhost:3000;
        access_log off;
    }
}
```

3. **Enable site:**
```bash
sudo ln -s /etc/nginx/sites-available/mcp-chat-ui /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 7. SSL/HTTPS Setup

#### Using Certbot (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

#### Using Cloudflare

1. Set up Cloudflare for your domain
2. Configure DNS to point to your server
3. Enable "Full (strict)" SSL mode
4. Use Cloudflare's origin certificates for server-side SSL

## Environment Configuration

### Production Environment Variables

Create a `.env.production` file:

```bash
# Application
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0

# Security
ENCRYPTION_KEY=your-32-character-encryption-key
SESSION_SECRET=your-session-secret

# LLM Providers
OPENAI_API_KEY=sk-your-openai-key
DEEPSEEK_API_KEY=sk-your-deepseek-key
OPENROUTER_API_KEY=sk-or-your-openrouter-key

# Data Storage
DATA_DIR=/app/data
CONFIG_DIR=/app/config

# Logging
LOG_LEVEL=info
AUDIT_ENABLED=true

# Performance
RATE_LIMIT_REQUESTS_PER_MINUTE=60
MAX_CHAT_HISTORY_LENGTH=1000
```

### Security Considerations

1. **API Keys:**
   - Store in environment variables, never in code
   - Use different keys for different environments
   - Regularly rotate keys
   - Monitor usage and set up alerts

2. **Network Security:**
   - Use HTTPS in production
   - Configure proper CORS settings
   - Implement rate limiting
   - Use a Web Application Firewall (WAF)

3. **Server Security:**
   - Keep system and dependencies updated
   - Use non-root user for application
   - Configure firewall rules
   - Regular security audits

4. **Data Protection:**
   - Encrypt sensitive data at rest
   - Secure backup procedures
   - Regular data cleanup
   - GDPR/privacy compliance

## Monitoring and Maintenance

### Health Monitoring

1. **Application Health:**
```bash
# Check application health
curl -f http://localhost:3000/api/health

# Use the health check script
./scripts/health-check.sh
```

2. **System Monitoring:**
```bash
# Check system resources
htop
df -h
free -h

# Check application logs
pm2 logs mcp-chat-ui
# or
journalctl -u mcp-chat-ui -f
```

### Backup Strategy

1. **Data Backup:**
```bash
# Create backup
tar -czf backup-$(date +%Y%m%d).tar.gz data/ config/

# Automated backup script
#!/bin/bash
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
tar -czf "$BACKUP_DIR/mcp-chat-ui-$DATE.tar.gz" data/ config/

# Keep only last 30 days
find "$BACKUP_DIR" -name "mcp-chat-ui-*.tar.gz" -mtime +30 -delete
```

2. **Database Backup (if using external DB):**
```bash
# PostgreSQL
pg_dump -h localhost -U username database_name > backup.sql

# MongoDB
mongodump --host localhost --db database_name --out backup/
```

### Updates and Maintenance

1. **Application Updates:**
```bash
# Pull latest changes
git pull origin main

# Install dependencies
npm ci

# Run tests
npm run test:all

# Build application
npm run build:production

# Restart application
pm2 restart mcp-chat-ui
# or
sudo systemctl restart mcp-chat-ui
```

2. **Dependency Updates:**
```bash
# Check for updates
npm outdated

# Update dependencies
npm update

# Security audit
npm audit
npm audit fix
```

## Troubleshooting

### Common Issues

1. **Application Won't Start:**
   - Check Node.js version compatibility
   - Verify environment variables are set
   - Check port availability
   - Review application logs

2. **MCP Servers Not Connecting:**
   - Verify MCP server installation
   - Check configuration file syntax
   - Review server-specific requirements
   - Check network connectivity

3. **Performance Issues:**
   - Monitor system resources
   - Check for memory leaks
   - Optimize database queries
   - Review rate limiting settings

4. **SSL/HTTPS Issues:**
   - Verify certificate validity
   - Check certificate chain
   - Review proxy configuration
   - Test with SSL Labs

### Log Analysis

```bash
# Application logs
tail -f logs/combined.log

# System logs
journalctl -u mcp-chat-ui -f

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Docker logs
docker-compose logs -f
```

## Performance Optimization

### Application Optimization

1. **Build Optimization:**
```bash
# Analyze bundle size
npm run build:analyze

# Enable compression
# Add to next.config.js
module.exports = {
  compress: true,
  poweredByHeader: false
}
```

2. **Caching Strategy:**
```nginx
# Nginx caching
location /_next/static/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

location /api/ {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
}
```

### Database Optimization

1. **Session Storage:**
   - Use Redis for session storage in high-traffic scenarios
   - Implement session cleanup routines
   - Monitor session storage usage

2. **File System:**
   - Use SSD storage for better performance
   - Implement file rotation for logs
   - Regular cleanup of temporary files

## Scaling Considerations

### Horizontal Scaling

1. **Load Balancing:**
```nginx
upstream mcp_chat_ui {
    server 127.0.0.1:3000;
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
}

server {
    location / {
        proxy_pass http://mcp_chat_ui;
    }
}
```

2. **Session Sharing:**
   - Use Redis for shared session storage
   - Implement sticky sessions if needed
   - Consider stateless authentication

### Vertical Scaling

1. **Resource Allocation:**
   - Monitor CPU and memory usage
   - Adjust PM2 instance count
   - Optimize Node.js heap size

2. **Database Scaling:**
   - Use connection pooling
   - Implement read replicas
   - Consider database sharding

## Support and Resources

- **Documentation:** Check the docs/ directory for detailed guides
- **Issues:** Report issues on the project repository
- **Community:** Join community discussions and forums
- **Professional Support:** Consider professional deployment services

For additional help with deployment, consult the developer documentation or reach out to the community for support.