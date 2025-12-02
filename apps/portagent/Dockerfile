# Portagent Dockerfile
# Dogfooding: Install directly from npm registry

FROM node:20-alpine

WORKDIR /app

# Install portagent from npm
RUN npm install -g @agentxjs/portagent

# Environment
ENV NODE_ENV=production
ENV PORT=5200

# Expose port
EXPOSE 5200

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5200/health || exit 1

# Run
CMD ["portagent"]
