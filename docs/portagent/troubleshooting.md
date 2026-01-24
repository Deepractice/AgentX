# Troubleshooting

This document summarizes common issues and solutions for Portagent.

## Startup Issues

### "LLM_PROVIDER_KEY is required"

**Cause**: Anthropic API key is not set.

**Solution**:

```bash
# Environment variable
export LLM_PROVIDER_KEY=sk-ant-api03-xxxxx

# Docker
docker run -e LLM_PROVIDER_KEY=sk-ant-api03-xxxxx ...

# CLI
portagent --api-key sk-ant-api03-xxxxx
```

### Service Exits Immediately After Start

**Troubleshooting Steps**:

1. Check logs

```bash
docker logs portagent
```

2. Common causes:
   - Invalid API key
   - Port is occupied
   - Data directory permission issues

3. Check port occupation

```bash
lsof -i :5200
# or
netstat -tuln | grep 5200
```

4. Check directory permissions

```bash
ls -la /var/lib/portagent
```

### Permission denied Error

**Cause**: Docker container runs as `node` user, mounted volume permissions don't match.

**Solution**:

```bash
# Change directory owner (node user UID is 1000)
sudo chown -R 1000:1000 ./data

# Or set permissive permissions
chmod -R 777 ./data
```

---

## Authentication Issues

### "Invalid invite code"

**Cause**: Invitation code is incorrect or timezone mismatch.

**Troubleshooting Steps**:

1. Confirm invitation code is enabled

```bash
# Check environment variable
echo $INVITE_CODE_REQUIRED
```

2. Calculate correct invitation code

```bash
# Docker containers use UTC timezone
TZ=UTC date -d "today 00:00:01" +%s
```

3. If testing, disable invitation code

```bash
docker run -e INVITE_CODE_REQUIRED=false ...
```

**Timezone Notes**:

- Docker containers default to UTC
- Invitation code is calculated based on server timezone
- Ensure you use the correct timezone when calculating invitation code

### "Invalid credentials"

**Cause**: Username/password is wrong or user doesn't exist.

**Troubleshooting Steps**:

1. Confirm user exists

```bash
docker exec portagent sqlite3 /home/node/.agentx/data/portagent.db \
  "SELECT username FROM users WHERE username = 'targetuser';"
```

2. Check if user is disabled

```bash
docker exec portagent sqlite3 /home/node/.agentx/data/portagent.db \
  "SELECT isActive FROM users WHERE username = 'targetuser';"
```

3. Reset password (requires database operation)

```bash
# Generating new password hash requires a script, recommend deleting user and re-registering
```

### Token Verification Failed

**Cause**: Token expired or JWT_SECRET changed.

**Troubleshooting Steps**:

1. Token expired
   - Token validity is 7 days
   - Need to re-login

2. JWT_SECRET changed
   - Container restart used new auto-generated key
   - Solution: Set fixed `JWT_SECRET`

```bash
docker run -e JWT_SECRET=your-fixed-secret ...
```

### All Users Need to Re-login

**Cause**: Fixed `JWT_SECRET` not set, new key auto-generated after restart.

**Solution**:

1. Generate fixed key

```bash
openssl rand -base64 32
```

2. Configure environment variable

```bash
export JWT_SECRET=your-generated-secret
```

---

## WebSocket Issues

### Cannot Establish WebSocket Connection

**Troubleshooting Steps**:

1. Check if Token is passed correctly

```javascript
// Correct connection method
const ws = new WebSocket(`ws://localhost:5200/ws?token=${token}`);
```

2. Check reverse proxy configuration

Nginx needs proper WebSocket configuration:

```nginx
location / {
    proxy_pass http://localhost:5200;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

3. Check firewall

```bash
# Ensure port 5200 is open
sudo ufw allow 5200
```

### WebSocket Connection Frequently Disconnects

**Possible Causes**:

1. Reverse proxy timeout too short

```nginx
location / {
    proxy_read_timeout 3600s;  # Increase timeout
    proxy_send_timeout 60s;
}
```

2. Network instability
   - Check network connection
   - Consider using heartbeat keepalive

3. Insufficient server resources
   - Check CPU and memory usage
   - Consider scaling up

### No Response After Sending Message

**Troubleshooting Steps**:

1. Check Claude API connection

```bash
curl -H "x-api-key: sk-ant-xxx" \
  -H "anthropic-version: 2023-06-01" \
  https://api.anthropic.com/v1/models
```

2. Check API key balance

3. View server logs

```bash
docker logs -f portagent
```

---

## Database Issues

### "database is locked"

**Cause**: Multiple processes accessing SQLite database simultaneously.

**Solution**:

1. Ensure only one Portagent instance is running

```bash
docker ps | grep portagent
```

2. Stop all instances and restart

```bash
docker stop portagent
docker rm portagent
docker run ...
```

### Database Corruption

**Symptoms**: Service fails to start, logs show SQLite errors.

**Troubleshooting Steps**:

1. Check integrity

```bash
sqlite3 /var/lib/portagent/data/portagent.db "PRAGMA integrity_check;"
```

2. Attempt recovery

```bash
sqlite3 /var/lib/portagent/data/portagent.db ".recover" | \
  sqlite3 /var/lib/portagent/data/portagent-recovered.db
```

3. Restore from backup

```bash
cp /var/backups/portagent/portagent-backup.db /var/lib/portagent/data/portagent.db
```

### Insufficient Disk Space

**Symptoms**: Write failures, logs show "disk full" or "no space left".

**Solution**:

1. Check disk usage

```bash
df -h
```

2. Clean log files

```bash
# Docker
docker exec portagent rm /home/node/.agentx/logs/*.log.*

# Or limit Docker log size
docker run --log-opt max-size=10m --log-opt max-file=3 ...
```

3. Clean old data

```bash
# Clean old sessions (use with caution)
sqlite3 /var/lib/portagent/data/agentx.db \
  "DELETE FROM messages WHERE timestamp < strftime('%s', 'now', '-30 days') * 1000;"
```

---

## Performance Issues

### Slow Response

**Troubleshooting Steps**:

1. Check Claude API latency

```bash
time curl -X POST https://api.anthropic.com/v1/messages \
  -H "x-api-key: sk-ant-xxx" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"claude-sonnet-4-20250514","max_tokens":100,"messages":[{"role":"user","content":"Hi"}]}'
```

2. Check server resources

```bash
docker stats portagent
```

3. Check network latency

```bash
ping api.anthropic.com
```

### High Memory Usage

**Possible Causes**:

1. Session data accumulation
2. Log buffer
3. Memory leak

**Solution**:

1. Limit memory usage

```bash
docker run --memory=2g --memory-swap=2g ...
```

2. Periodic service restart (temporary solution)

```bash
docker restart portagent
```

### High CPU Usage

**Possible Causes**:

1. High concurrent requests
2. Frequent log writes

**Solution**:

1. Limit CPU

```bash
docker run --cpus=2 ...
```

2. Lower log level

```bash
docker run -e LOG_LEVEL=warn ...
```

---

## Network Issues

### Cannot Access Claude API

**Troubleshooting Steps**:

1. Test connection

```bash
curl -I https://api.anthropic.com
```

2. Check DNS

```bash
nslookup api.anthropic.com
```

3. Check proxy settings

```bash
# If proxy needed
docker run -e HTTP_PROXY=http://proxy:8080 ...
```

### Port Occupied

**Solution**:

1. Find occupying process

```bash
lsof -i :5200
```

2. Use different port

```bash
docker run -p 5201:5200 ...
# or
portagent --port 5201
```

---

## Frontend Issues

### Blank Page

**Troubleshooting Steps**:

1. Check browser console for errors
2. Confirm static files are built correctly

```bash
ls dist/public/
```

3. Check if index.html is correct

### Cannot Login/Register

**Troubleshooting Steps**:

1. Check network requests (browser developer tools)
2. View server response
3. Confirm CORS configuration

### Missing Styles

**Cause**: CSS file not built or loaded correctly.

**Solution**:

```bash
# Rebuild
cd apps/portagent
bun run build
```

---

## Docker Issues

### Image Pull Failed

```bash
# Use mirror acceleration
docker pull registry.cn-hangzhou.aliyuncs.com/deepractice/portagent:latest
```

### Container Cannot Access Network

```bash
# Check network configuration
docker network ls
docker inspect portagent | grep -A 20 NetworkSettings
```

### Logs Too Large

```bash
# Limit log size
docker run \
  --log-driver json-file \
  --log-opt max-size=10m \
  --log-opt max-file=3 \
  ...
```

---

## Log Analysis

### Common Error Logs

| Log Content                           | Meaning            | Solution                 |
| ------------------------------------- | ------------------ | ------------------------ |
| `Error: LLM_PROVIDER_KEY is required` | API key not set    | Set environment variable |
| `Invalid API key`                     | API key invalid    | Check key format         |
| `SQLITE_BUSY`                         | Database locked    | Ensure single instance   |
| `ECONNREFUSED`                        | Connection refused | Check network            |
| `ETIMEDOUT`                           | Connection timeout | Check network/proxy      |

### Enable Debug Logs

```bash
docker run -e LOG_LEVEL=debug ...
```

### Export Logs for Analysis

```bash
docker logs portagent > portagent.log 2>&1
grep -i error portagent.log
```

---

## Getting Help

### Collect Diagnostic Information

When reporting issues, please provide:

1. Version information

```bash
portagent --version
docker inspect deepracticexs/portagent:latest | grep -i version
```

2. Environment information

```bash
uname -a
docker version
```

3. Related logs

```bash
docker logs --tail 100 portagent
```

4. Configuration (hide sensitive information)

```bash
# Do not expose API key
env | grep -E "^(PORT|LOG_LEVEL|INVITE)"
```

### Quick Command Reference

```bash
# View logs
docker logs -f portagent

# Enter container
docker exec -it portagent sh

# Health check
curl http://localhost:5200/health

# Check database
docker exec portagent sqlite3 /home/node/.agentx/data/portagent.db ".tables"

# Restart service
docker restart portagent

# Complete rebuild
docker stop portagent && docker rm portagent && docker run ...
```

---

## Related Documentation

- [Deployment Guide](./deployment.md) - Proper deployment methods
- [Configuration Reference](./configuration.md) - Configuration options explained
- [Operations Guide](./operations.md) - Daily operations
