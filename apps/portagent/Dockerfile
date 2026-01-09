# Portagent Dockerfile
# Image: deepracticexs/portagent
#
# Multi-stage build with target selection:
#   npm (default): Install from npm registry (for production)
#   local: Use locally built binaries (for development/testing)
#
# Usage:
#   Production (from npm):
#     docker build --target npm -t portagent .
#     docker build --target npm --build-arg VERSION=1.0.0 -t portagent .
#
#   Local development:
#     bun run build  # Build locally first
#     docker build --target local -t portagent-dev .

# ============================================================
# Base Stage - Common configuration
# ============================================================
FROM deepracticexs/agent-runtime AS base

WORKDIR /app

# Create data directory for node user with proper permissions
RUN mkdir -p /home/node/.agentx && chown -R node:node /home/node/.agentx

# Environment - Defaults
ENV NODE_ENV=production
ENV PORT=5200
ENV LOG_LEVEL=info
ENV AGENTX_DIR=/home/node/.agentx

# Environment - Required (must be provided at runtime)
# LLM_PROVIDER_KEY=sk-ant-xxxxx    # Anthropic API key
# LLM_PROVIDER_MODEL=claude-haiku-4-5-20251001
# Environment - Optional (can be overridden at runtime)
# LLM_PROVIDER_URL=https://api.anthropic.com
# JWT_SECRET=your-jwt-secret       # Auto-generated if not set
# INVITE_CODE_REQUIRED=true        # Set to "false" to disable

# Run as non-root user (already defined in base image)
USER node

# Expose port
EXPOSE 5200

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5200/health || exit 1

# ============================================================
# NPM Stage - Install from npm registry (Production)
# ============================================================
FROM base AS npm

# Version to install (passed from CI)
ARG VERSION=latest

# Switch to root for npm install
USER root

# Install specific version from npm
RUN npm install -g @agentxjs/portagent@${VERSION}

# Switch back to node user
USER node

# Run
CMD ["portagent"]

# ============================================================
# Local Stage - Use locally built binaries (Development)
# ============================================================
FROM base AS local

# Switch to root for file operations
USER root

# Copy entire dist directory
COPY dist /usr/local/lib/portagent

# Select correct binary based on architecture and create symlink
RUN ARCH=$(uname -m) && \
    if [ "$ARCH" = "x86_64" ]; then \
      ln -sf /usr/local/lib/portagent/bin/portagent-linux-x64 /usr/local/bin/portagent; \
    elif [ "$ARCH" = "aarch64" ]; then \
      ln -sf /usr/local/lib/portagent/bin/portagent-linux-arm64 /usr/local/bin/portagent; \
    else \
      echo "Unsupported architecture: $ARCH" && exit 1; \
    fi && \
    chmod +x /usr/local/lib/portagent/bin/*

# Switch back to node user
USER node

# Run
CMD ["portagent"]
