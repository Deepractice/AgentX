# Operations Guide

This document describes daily operations for Portagent, including data management, logging, monitoring, and backup.

## Data Directory Structure

Default data directory is `~/.agentx` (or `/home/node/.agentx` in Docker):

```
{AGENTX_DIR}/
├── data/
│   ├── agentx.db      # AgentX data (containers, images, sessions, messages)
│   └── portagent.db   # User authentication data
└── logs/
    └── portagent.log  # Application logs
```

### Data File Description

| File            | Description                        | Size Estimate       |
| --------------- | ---------------------------------- | ------------------- |
| `agentx.db`     | Agent sessions and message history | Grows with usage    |
| `portagent.db`  | User account information           | Usually small       |
| `portagent.log` | Application runtime logs           | Max 70MB (7 x 10MB) |

---

## Data Backup

### Manual Backup

#### Offline Backup

```bash
# Stop service
docker stop portagent

# Backup data directory
cp -r ./data ./backup-$(date +%Y%m%d)

# Start service
docker start portagent
```

#### Online Backup (SQLite)

Use SQLite backup command, no downtime required:

```bash
# Docker environment
docker exec portagent sqlite3 /home/node/.agentx/data/agentx.db ".backup /home/node/.agentx/data/agentx-backup.db"
docker exec portagent sqlite3 /home/node/.agentx/data/portagent.db ".backup /home/node/.agentx/data/portagent-backup.db"

# Copy to host
docker cp portagent:/home/node/.agentx/data/agentx-backup.db ./
docker cp portagent:/home/node/.agentx/data/portagent-backup.db ./
```

### Automated Backup Script

Create `backup.sh`:

```bash
#!/bin/bash

BACKUP_DIR="/var/backups/portagent"
DATA_DIR="/var/lib/portagent/data"
RETENTION_DAYS=30

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Generate backup filename
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Backup databases
sqlite3 "$DATA_DIR/agentx.db" ".backup $BACKUP_DIR/agentx-$TIMESTAMP.db"
sqlite3 "$DATA_DIR/portagent.db" ".backup $BACKUP_DIR/portagent-$TIMESTAMP.db"

# Compress backup
tar -czf "$BACKUP_DIR/backup-$TIMESTAMP.tar.gz" \
  "$BACKUP_DIR/agentx-$TIMESTAMP.db" \
  "$BACKUP_DIR/portagent-$TIMESTAMP.db"

# Delete temporary files
rm "$BACKUP_DIR/agentx-$TIMESTAMP.db" "$BACKUP_DIR/portagent-$TIMESTAMP.db"

# Clean old backups
find "$BACKUP_DIR" -name "backup-*.tar.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: $BACKUP_DIR/backup-$TIMESTAMP.tar.gz"
```

Configure cron for scheduled backup:

```bash
# Daily backup at 2 AM
0 2 * * * /path/to/backup.sh >> /var/log/portagent-backup.log 2>&1
```

### Data Recovery

```bash
# Stop service
docker stop portagent

# Extract backup
tar -xzf backup-20250115_020000.tar.gz

# Restore databases
cp agentx-20250115_020000.db /var/lib/portagent/data/agentx.db
cp portagent-20250115_020000.db /var/lib/portagent/data/portagent.db

# Fix permissions
chown -R 1000:1000 /var/lib/portagent/data

# Start service
docker start portagent
```

---

## Log Management

### Log Configuration

Log level is configured via `LOG_LEVEL` environment variable:

| Level   | Description         | Use Case                        |
| ------- | ------------------- | ------------------------------- |
| `debug` | Detailed debug info | Development and troubleshooting |
| `info`  | Normal runtime info | Production (default)            |
| `warn`  | Warning messages    | Production                      |
| `error` | Error messages only | Minimal logging                 |

### Log Rotation

Portagent uses LogTape for automatic log rotation:

- **Max file size**: 10MB
- **Files retained**: 7
- **Total max capacity**: ~70MB

### View Logs

#### Docker Environment

```bash
# View real-time logs
docker logs -f portagent

# View last 100 lines
docker logs --tail 100 portagent

# View file logs
docker exec portagent cat /home/node/.agentx/logs/portagent.log

# Follow file logs in real-time
docker exec portagent tail -f /home/node/.agentx/logs/portagent.log
```

#### systemd Environment

```bash
# View service logs
journalctl -u portagent -f

# View recent logs
journalctl -u portagent --since "1 hour ago"
```

### Log Analysis

#### Count Requests

```bash
grep "POST /api/auth/login" portagent.log | wc -l
```

#### Find Errors

```bash
grep -i "error" portagent.log
```

#### Filter by Time

```bash
grep "2025-01-15" portagent.log
```

---

## Health Checks

### Built-in Health Check

```bash
# Using curl
curl http://localhost:5200/health

# Response
{"status":"ok","timestamp":1736899200000}
```

### Docker Health Check

The Docker image has configured health checks:

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5200/health || exit 1
```

View health status:

```bash
docker inspect --format='{{.State.Health.Status}}' portagent
```

### External Monitoring

#### Prometheus

Create monitoring endpoint (needs to be added):

```typescript
app.get("/metrics", (c) => {
  const metrics = `
# HELP portagent_uptime_seconds Server uptime in seconds
# TYPE portagent_uptime_seconds gauge
portagent_uptime_seconds ${process.uptime()}

# HELP portagent_users_total Total registered users
# TYPE portagent_users_total gauge
portagent_users_total ${userCount}
`;
  return c.text(metrics);
});
```

#### UptimeRobot / Pingdom

Configure HTTP check:

- URL: `https://your-domain.com/health`
- Expected response: Contains `"status":"ok"`
- Check interval: 5 minutes

---

## Performance Monitoring

### Resource Usage

```bash
# Docker resource usage
docker stats portagent

# Example output
CONTAINER   CPU %   MEM USAGE / LIMIT     MEM %   NET I/O       BLOCK I/O
portagent   2.5%    256MiB / 2GiB         12.5%   10MB / 5MB    50MB / 20MB
```

### Database Size

```bash
# View database sizes
docker exec portagent ls -lh /home/node/.agentx/data/

# Example output
total 12M
-rw-r--r-- 1 node node  8.0M Jan 15 10:00 agentx.db
-rw-r--r-- 1 node node  512K Jan 15 10:00 portagent.db
```

### Connection Count

```bash
# View network connections
docker exec portagent ss -tuln | grep 5200
```

---

## Database Maintenance

### SQLite Optimization

Periodically run VACUUM to optimize database:

```bash
# Docker environment
docker exec portagent sqlite3 /home/node/.agentx/data/agentx.db "VACUUM;"
docker exec portagent sqlite3 /home/node/.agentx/data/portagent.db "VACUUM;"
```

### Integrity Check

```bash
# Check database integrity
docker exec portagent sqlite3 /home/node/.agentx/data/agentx.db "PRAGMA integrity_check;"
```

### Statistics

```bash
# View table statistics
docker exec portagent sqlite3 /home/node/.agentx/data/portagent.db "SELECT COUNT(*) FROM users;"
docker exec portagent sqlite3 /home/node/.agentx/data/agentx.db "SELECT COUNT(*) FROM images;"
```

---

## User Management

### View User List

```bash
docker exec portagent sqlite3 /home/node/.agentx/data/portagent.db \
  "SELECT userId, username, email, datetime(createdAt/1000, 'unixepoch') FROM users;"
```

### Disable User

```bash
docker exec portagent sqlite3 /home/node/.agentx/data/portagent.db \
  "UPDATE users SET isActive = 0 WHERE username = 'baduser';"
```

### Delete User

```bash
# Get user's containerId
docker exec portagent sqlite3 /home/node/.agentx/data/portagent.db \
  "SELECT containerId FROM users WHERE username = 'targetuser';"

# Delete user record
docker exec portagent sqlite3 /home/node/.agentx/data/portagent.db \
  "DELETE FROM users WHERE username = 'targetuser';"

# Note: Related Container data needs to be cleaned separately
```

---

## Security Hardening

### File Permissions

```bash
# Ensure correct data directory permissions
chmod 700 /var/lib/portagent
chmod 600 /var/lib/portagent/data/*.db
```

### Network Isolation

```yaml
# docker-compose.yml
services:
  portagent:
    networks:
      - internal
    # Only expose to reverse proxy
    expose:
      - "5200"

  nginx:
    networks:
      - internal
      - external
    ports:
      - "443:443"

networks:
  internal:
    internal: true
  external:
```

### Resource Limits

```yaml
services:
  portagent:
    deploy:
      resources:
        limits:
          cpus: "2"
          memory: 2G
        reservations:
          cpus: "0.5"
          memory: 512M
```

---

## Disaster Recovery

### Service Won't Start

1. Check logs

```bash
docker logs portagent
```

2. Check environment variables

```bash
docker inspect portagent | grep -A 20 "Env"
```

3. Check database integrity

```bash
sqlite3 /var/lib/portagent/data/portagent.db "PRAGMA integrity_check;"
```

### Database Corruption

1. Stop service
2. Attempt recovery

```bash
sqlite3 /var/lib/portagent/data/portagent.db ".recover" | sqlite3 /var/lib/portagent/data/portagent-recovered.db
```

3. If recovery fails, restore from backup

### WebSocket Connection Issues

1. Check reverse proxy WebSocket configuration
2. Check firewall rules
3. Check client console errors

---

## Version Upgrade

### Docker Upgrade

```bash
# Backup data
./backup.sh

# Pull new version
docker pull deepracticexs/portagent:1.0.0

# Stop old container
docker stop portagent
docker rm portagent

# Start new container
docker run -d \
  --name portagent \
  -p 5200:5200 \
  -e LLM_PROVIDER_KEY=$LLM_PROVIDER_KEY \
  -v /var/lib/portagent:/home/node/.agentx \
  deepracticexs/portagent:1.0.0

# Verify
curl http://localhost:5200/health
```

### Docker Compose Upgrade

```bash
# Backup data
./backup.sh

# Update image tag
# Edit image version in docker-compose.yml

# Recreate container
docker compose up -d

# Verify
docker compose logs -f
```

### npm Upgrade

```bash
# Update global package
npm update -g @agentxjs/portagent

# Verify version
portagent --version
```

---

## Monitoring Alerts

### Recommended Metrics

| Metric        | Threshold              | Description              |
| ------------- | ---------------------- | ------------------------ |
| Health check  | 3 consecutive failures | Service unavailable      |
| Memory usage  | > 80%                  | May need scaling         |
| Disk usage    | > 90%                  | Needs cleanup or scaling |
| Response time | > 5s                   | Performance issue        |
| Error rate    | > 5%                   | Needs investigation      |

### Alert Script Example

```bash
#!/bin/bash

HEALTH_URL="http://localhost:5200/health"
ALERT_EMAIL="admin@example.com"

response=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL")

if [ "$response" != "200" ]; then
  echo "Portagent is down! Response code: $response" | mail -s "Alert: Portagent Down" "$ALERT_EMAIL"
fi
```

---

## Next Steps

- See [Troubleshooting](./troubleshooting.md) for common issues
- See [Architecture Design](./architecture.md) for system internals
