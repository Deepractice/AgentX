# Deployment Guide

This document describes various deployment methods for Portagent.

## Docker Deployment (Recommended)

Docker is the recommended deployment method for production environments, providing consistent runtime and simple management.

### Quick Start

```bash
docker run -d \
  --name portagent \
  -p 5200:5200 \
  -e LLM_PROVIDER_KEY=sk-ant-xxxxx \
  -e LLM_PROVIDER_URL=https://api.anthropic.com \
  -v ./data:/home/node/.agentx \
  deepracticexs/portagent:latest
```

### Production Configuration

```bash
docker run -d \
  --name portagent \
  --restart unless-stopped \
  -p 5200:5200 \
  -e LLM_PROVIDER_KEY=sk-ant-xxxxx \
  -e LLM_PROVIDER_URL=https://api.anthropic.com \
  -e LLM_PROVIDER_MODEL=claude-sonnet-4-20250514 \
  -e JWT_SECRET=your-secure-random-secret \
  -e INVITE_CODE_REQUIRED=true \
  -e LOG_LEVEL=info \
  -v /var/lib/portagent:/home/node/.agentx \
  deepracticexs/portagent:0.1.9
```

### Image Versions

```bash
# Latest version
docker pull deepracticexs/portagent:latest

# Specific version (recommended for production)
docker pull deepracticexs/portagent:0.1.9

# Supported architectures: linux/amd64, linux/arm64
```

---

## Docker Compose Deployment

Suitable for scenarios that require orchestration with other services.

### Create Configuration Files

Create `.env` file:

```env
LLM_PROVIDER_KEY=sk-ant-xxxxx
LLM_PROVIDER_URL=https://api.anthropic.com
LLM_PROVIDER_MODEL=claude-sonnet-4-20250514
JWT_SECRET=your-secure-random-secret
INVITE_CODE_REQUIRED=false
LOG_LEVEL=info
```

Create `docker-compose.yml`:

```yaml
services:
  portagent:
    image: deepracticexs/portagent:latest
    container_name: portagent
    restart: unless-stopped
    ports:
      - "5200:5200"
    environment:
      - LLM_PROVIDER_KEY=${LLM_PROVIDER_KEY}
      - LLM_PROVIDER_URL=${LLM_PROVIDER_URL:-https://api.anthropic.com}
      - LLM_PROVIDER_MODEL=${LLM_PROVIDER_MODEL:-claude-sonnet-4-20250514}
      - JWT_SECRET=${JWT_SECRET}
      - INVITE_CODE_REQUIRED=${INVITE_CODE_REQUIRED:-false}
      - LOG_LEVEL=${LOG_LEVEL:-info}
    volumes:
      - ./data:/home/node/.agentx
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:5200/health"]
      interval: 30s
      timeout: 10s
      start_period: 5s
      retries: 3
```

### Start Service

```bash
docker compose up -d
```

### View Logs

```bash
docker compose logs -f portagent
```

---

## npm Global Installation

Suitable for servers with existing Node.js environments.

### Installation

```bash
npm install -g @agentxjs/portagent
```

### Run

```bash
# Set environment variables
export LLM_PROVIDER_KEY=sk-ant-xxxxx
export LLM_PROVIDER_URL=https://api.anthropic.com

# Start service
portagent
```

### Using CLI Parameters

```bash
portagent \
  --port 5200 \
  --data-dir /var/lib/portagent \
  --api-key sk-ant-xxxxx \
  --api-url https://api.anthropic.com \
  --jwt-secret your-secure-secret
```

### Using Environment File

```bash
portagent --env-file /path/to/.env
```

---

## npx Quick Trial

Run without installation (suitable for quick testing):

```bash
LLM_PROVIDER_KEY=sk-ant-xxxxx npx @agentxjs/portagent
```

---

## Building Docker Image Locally

For custom builds:

```bash
# Clone repository
git clone https://github.com/Deepractice/AgentX.git
cd AgentX

# Install dependencies and build
bun install
bun build

# Build Docker image
docker build -t portagent:local -f apps/portagent/Dockerfile .

# Run locally built image
docker run -d \
  --name portagent \
  -p 5200:5200 \
  -e LLM_PROVIDER_KEY=sk-ant-xxxxx \
  portagent:local
```

---

## Reverse Proxy Configuration

Production environments should use a reverse proxy to provide HTTPS support.

### Nginx Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name portagent.example.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";

    location / {
        proxy_pass http://localhost:5200;
        proxy_http_version 1.1;

        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Pass real IP
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeout settings (suitable for long connections)
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 3600s;
    }
}

# HTTP redirect to HTTPS
server {
    listen 80;
    server_name portagent.example.com;
    return 301 https://$server_name$request_uri;
}
```

### Caddy Configuration

```caddyfile
portagent.example.com {
    reverse_proxy localhost:5200
}
```

Caddy automatically handles HTTPS certificates and WebSocket proxying.

---

## systemd Service Configuration

Use systemd to manage the service on Linux servers.

### Create Service File

Create `/etc/systemd/system/portagent.service`:

```ini
[Unit]
Description=Portagent - AgentX Portal
After=network.target

[Service]
Type=simple
User=node
Group=node
WorkingDirectory=/var/lib/portagent
Environment=NODE_ENV=production
Environment=PORT=5200
Environment=AGENTX_DIR=/var/lib/portagent
EnvironmentFile=/etc/portagent/env
ExecStart=/usr/local/bin/portagent
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### Create Environment File

Create `/etc/portagent/env`:

```env
LLM_PROVIDER_KEY=sk-ant-xxxxx
LLM_PROVIDER_URL=https://api.anthropic.com
JWT_SECRET=your-secure-secret
INVITE_CODE_REQUIRED=true
```

### Start Service

```bash
sudo systemctl daemon-reload
sudo systemctl enable portagent
sudo systemctl start portagent
sudo systemctl status portagent
```

---

## Security Recommendations

### 1. API Key Protection

- Do not expose `LLM_PROVIDER_KEY` in code or logs
- Use environment variables or secrets management tools
- Rotate API keys regularly

### 2. JWT Key Management

- Use strong random keys (at least 32 characters)
- Keep consistent across container restarts
- Do not use auto-generated keys in production

```bash
# Generate secure JWT key
openssl rand -base64 32
```

### 3. Invitation Code Control

- Enable invitation codes in production
- Update invitation codes regularly (automatically changes daily)

### 4. Network Security

- Use HTTPS (via reverse proxy)
- Restrict direct access to port 5200
- Configure firewall rules

### 5. Container Security

- Container runs as non-root user `node`
- Mounted volumes require correct permissions

```bash
# Fix permission issues
sudo chown -R 1000:1000 ./data
```

---

## Next Steps

- See [Configuration Reference](./configuration.md) for complete configuration options
- See [Operations Guide](./operations.md) for daily operations
- See [Troubleshooting](./troubleshooting.md) for deployment issues
