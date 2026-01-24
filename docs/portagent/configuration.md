# Configuration Reference

This document provides detailed information about all configuration options for Portagent.

## Environment Variables

### Required Configuration

| Variable           | Description       | Example              |
| ------------------ | ----------------- | -------------------- |
| `LLM_PROVIDER_KEY` | Anthropic API key | `sk-ant-api03-xxxxx` |

### LLM Configuration

| Variable             | Default                     | Description         |
| -------------------- | --------------------------- | ------------------- |
| `LLM_PROVIDER_URL`   | `https://api.anthropic.com` | API base URL        |
| `LLM_PROVIDER_MODEL` | `claude-sonnet-4-20250514`  | Claude model to use |

**Available Models**:

- `claude-sonnet-4-20250514` - Recommended, balanced performance and cost
- `claude-opus-4-20250514` - Strongest capabilities
- `claude-haiku-4-5-20251001` - Fastest response

### Server Configuration

| Variable     | Default      | Description                                        |
| ------------ | ------------ | -------------------------------------------------- |
| `PORT`       | `5200`       | HTTP/WebSocket service port                        |
| `AGENTX_DIR` | `~/.agentx`  | Data directory path                                |
| `NODE_ENV`   | `production` | Runtime environment (`production` / `development`) |

### Authentication Configuration

| Variable               | Default        | Description                                          |
| ---------------------- | -------------- | ---------------------------------------------------- |
| `JWT_SECRET`           | Auto-generated | JWT signing key                                      |
| `INVITE_CODE_REQUIRED` | `false`        | Whether invitation code is required for registration |

**Important**: Production environments should set a fixed `JWT_SECRET`, otherwise all users will need to re-login after each restart.

### Logging Configuration

| Variable    | Default | Description |
| ----------- | ------- | ----------- |
| `LOG_LEVEL` | `info`  | Log level   |

**Log Levels**:

- `debug` - Detailed debug information
- `info` - Normal runtime information
- `warn` - Warning messages
- `error` - Error messages only

### MCP Integration Configuration

| Variable         | Default | Description                          |
| ---------------- | ------- | ------------------------------------ |
| `ENABLE_PROMPTX` | `true`  | Whether to enable PromptX MCP server |

Set `ENABLE_PROMPTX=false` to disable PromptX integration.

---

## CLI Parameters

Configure Portagent via command line parameters:

```bash
portagent [options]
```

### Available Parameters

| Parameter               | Short | Description           | Example                             |
| ----------------------- | ----- | --------------------- | ----------------------------------- |
| `--port <port>`         | `-p`  | Service port          | `--port 3000`                       |
| `--data-dir <path>`     | `-d`  | Data directory        | `--data-dir /var/lib/portagent`     |
| `--env-file <path>`     | `-e`  | Environment file path | `--env-file .env.prod`              |
| `--jwt-secret <secret>` | -     | JWT key               | `--jwt-secret xxx`                  |
| `--api-key <key>`       | -     | API key               | `--api-key sk-ant-xxx`              |
| `--api-url <url>`       | -     | API base URL          | `--api-url https://api.example.com` |
| `--model <model>`       | -     | Model name            | `--model claude-sonnet-4-20250514`  |
| `--help`                | `-h`  | Show help             | `--help`                            |
| `--version`             | `-V`  | Show version          | `--version`                         |

### Priority

CLI parameters > Environment variables > Default values

### Examples

```bash
# Start with CLI parameters
portagent --port 3000 --data-dir /data/portagent --api-key sk-ant-xxx

# Load custom environment file
portagent --env-file /etc/portagent/.env.production

# Override settings from environment file
portagent --env-file .env --port 8080
```

---

## Environment Files

Portagent loads environment files in the following order:

1. File specified by `--env-file` (if provided)
2. `.env.local` in current directory
3. `.env` in current directory

### Example .env File

```env
# LLM Configuration
LLM_PROVIDER_KEY=sk-ant-api03-xxxxx
LLM_PROVIDER_URL=https://api.anthropic.com
LLM_PROVIDER_MODEL=claude-sonnet-4-20250514

# Server Configuration
PORT=5200
AGENTX_DIR=/var/lib/portagent

# Authentication Configuration
JWT_SECRET=your-secure-random-secret-at-least-32-chars
INVITE_CODE_REQUIRED=true

# Logging Configuration
LOG_LEVEL=info

# MCP Configuration
ENABLE_PROMPTX=true
```

---

## Docker Environment Variables

### Base Image Presets

The Docker image presets the following environment variables:

```dockerfile
ENV NODE_ENV=production
ENV PORT=5200
ENV LOG_LEVEL=info
ENV AGENTX_DIR=/home/node/.agentx
```

### Runtime Override

```bash
docker run -d \
  -e LLM_PROVIDER_KEY=sk-ant-xxxxx \
  -e LLM_PROVIDER_MODEL=claude-haiku-4-5-20251001 \
  -e JWT_SECRET=my-secret \
  -e INVITE_CODE_REQUIRED=true \
  deepracticexs/portagent:latest
```

### Docker Compose Configuration

```yaml
services:
  portagent:
    image: deepracticexs/portagent:latest
    environment:
      - LLM_PROVIDER_KEY=${LLM_PROVIDER_KEY}
      - LLM_PROVIDER_URL=${LLM_PROVIDER_URL:-https://api.anthropic.com}
      - LLM_PROVIDER_MODEL=${LLM_PROVIDER_MODEL:-claude-sonnet-4-20250514}
      - JWT_SECRET=${JWT_SECRET}
      - INVITE_CODE_REQUIRED=${INVITE_CODE_REQUIRED:-false}
      - LOG_LEVEL=${LOG_LEVEL:-info}
      - ENABLE_PROMPTX=${ENABLE_PROMPTX:-true}
```

---

## PromptX MCP Integration

Portagent integrates PromptX MCP server by default, providing prompt management functionality.

### Enable/Disable

```bash
# Enable (default)
ENABLE_PROMPTX=true portagent

# Disable
ENABLE_PROMPTX=false portagent
```

### PromptX in Docker Image

The Docker image comes with PromptX CLI pre-installed:

```dockerfile
RUN npm install -g @promptx/cli
```

### Default Agent Configuration

When PromptX is enabled, the default Agent is configured as:

```typescript
{
  name: "Assistant",
  systemPrompt: "...", // Preset welcome message
  mcpServers: {
    promptx: {
      command: "promptx",
      args: ["mcp-server"],
    },
  },
}
```

When PromptX is disabled:

```typescript
{
  name: "Assistant",
  systemPrompt: "You are a helpful AI assistant.",
}
```

---

## Data Directory Structure

After configuring `AGENTX_DIR`, the directory structure is as follows:

```
{AGENTX_DIR}/
├── data/
│   ├── agentx.db      # AgentX data (containers, images, sessions)
│   └── portagent.db   # User authentication data
└── logs/
    └── portagent.log  # Application logs
```

### Default Locations

- **Host**: `~/.agentx/`
- **Docker**: `/home/node/.agentx/`

---

## Model Selection Guide

| Model                       | Speed   | Capability | Cost    | Use Cases                             |
| --------------------------- | ------- | ---------- | ------- | ------------------------------------- |
| `claude-haiku-4-5-20251001` | Fastest | Basic      | Lowest  | Simple conversations, quick responses |
| `claude-sonnet-4-20250514`  | Medium  | Strong     | Medium  | General use (recommended)             |
| `claude-opus-4-20250514`    | Slower  | Strongest  | Highest | Complex reasoning, code generation    |

### Configuration Examples

```bash
# Quick response scenarios
LLM_PROVIDER_MODEL=claude-haiku-4-5-20251001

# General scenarios (default)
LLM_PROVIDER_MODEL=claude-sonnet-4-20250514

# High-quality output scenarios
LLM_PROVIDER_MODEL=claude-opus-4-20250514
```

---

## Configuration Validation

On startup, Portagent outputs the current configuration:

```
  ____            _                         _
 |  _ \ ___  _ __| |_ __ _  __ _  ___ _ __ | |_
 | |_) / _ \| '__| __/ _` |/ _` |/ _ \ '_ \| __|
 |  __/ (_) | |  | || (_| | (_| |  __/ | | | |_
 |_|   \___/|_|   \__\__,_|\__, |\___|_| |_|\__|
                           |___/

  AgentX Portal - Your AI Agent Gateway (Multi-User Mode)

Configuration:
  Port: 5200
  Data Dir: /home/node/.agentx
  API Key: sk-ant-api03-xxx...
  User DB: /home/node/.agentx/data/portagent.db
  AgentX DB: /home/node/.agentx/data/agentx.db
  Logs: /home/node/.agentx/logs
  Invite Code: required
  PromptX MCP: enabled
```

---

## Next Steps

- See [Authentication System](./authentication.md) for JWT and invitation code mechanism
- See [Architecture Design](./architecture.md) for system internals
- See [Troubleshooting](./troubleshooting.md) for configuration issues
