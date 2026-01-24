# Portagent

**Production-ready AgentX deployment example** - Demonstrates how to deploy the AgentX framework as a multi-user SaaS application.

Portagent is a multi-user AI Agent gateway built on [AgentX](https://github.com/Deepractice/AgentX). It serves not only as a ready-to-use product but also as a reference implementation of the AgentX framework in production environments, showcasing:

- How to implement multi-user isolation (Container-Per-User model)
- How to integrate JWT authentication and invitation code system
- How to achieve real-time communication via WebSocket
- How to perform Docker deployment and operations

## Core Features

- **Multi-user Support** - User registration, login, JWT authentication
- **WebSocket Real-time Communication** - Bidirectional real-time communication with AI Agent
- **Invitation Code System** - Optional invitation code to control registration access
- **Persistent Storage** - SQLite-based storage for users, sessions, and Agent data
- **Docker Ready** - Pre-built Docker images, ready to use out of the box
- **Claude Integration** - Access to Anthropic Claude API via Claude Agent SDK
- **PromptX MCP Integration** - Optional PromptX prompt management system

## Quick Start

### Using Docker (Recommended)

Start with a single command:

```bash
docker run -d \
  --name portagent \
  -p 5200:5200 \
  -e LLM_PROVIDER_KEY=sk-ant-xxxxx \
  -v ./data:/home/node/.agentx \
  deepracticexs/portagent:latest
```

Then visit <http://localhost:5200>.

### Using npx

Requires Node.js 20+:

```bash
LLM_PROVIDER_KEY=sk-ant-xxxxx npx @agentxjs/portagent
```

### Using npm Global Installation

```bash
npm install -g @agentxjs/portagent
export LLM_PROVIDER_KEY=sk-ant-xxxxx
portagent
```

## System Requirements

- **Runtime Environment**: Node.js 20+ or Docker
- **API Key**: Anthropic API Key (starts with `sk-ant-`)
- **Storage Space**: At least 500MB (including Claude Code SDK)

## Default Configuration

| Option      | Default     | Description                               |
| ----------- | ----------- | ----------------------------------------- |
| Port        | 5200        | HTTP/WebSocket service port               |
| Data Dir    | `~/.agentx` | Database and log storage location         |
| Invite Code | Disabled    | Set `INVITE_CODE_REQUIRED=true` to enable |
| Log Level   | info        | Options: debug, info, warn, error         |

## Documentation Navigation

| Section                                       | Description                                           |
| --------------------------------------------- | ----------------------------------------------------- |
| [Deployment Guide](./deployment.md)           | Docker, npm, binary deployment methods                |
| [Configuration Reference](./configuration.md) | Complete environment variables and CLI parameters     |
| [Authentication System](./authentication.md)  | JWT authentication and invitation code mechanism      |
| [Architecture Design](./architecture.md)      | System architecture, data models, API endpoints       |
| [Development Guide](./development.md)         | Local development environment setup and build process |
| [Operations Guide](./operations.md)           | Data backup, log management, monitoring               |
| [Troubleshooting](./troubleshooting.md)       | Common issues and solutions                           |

## Next Steps

- See [Deployment Guide](./deployment.md) for detailed deployment steps
- See [Configuration Reference](./configuration.md) for all configurable options
- See [Authentication System](./authentication.md) for invitation code calculation methods
