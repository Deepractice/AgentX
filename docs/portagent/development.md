# Development Guide

This document describes how to set up the Portagent local development environment and custom development.

## Environment Requirements

- **Node.js**: 20+
- **Bun**: 1.0+ (package management and build)
- **Git**: Version control

## Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/Deepractice/AgentX.git
cd AgentX
```

### 2. Install Dependencies

```bash
bun install
```

### 3. Build All Packages

```bash
bun build
```

### 4. Configure Environment Variables

Create `.env.local` in the `apps/portagent` directory:

```env
LLM_PROVIDER_KEY=sk-ant-api03-xxxxx
LLM_PROVIDER_URL=https://api.anthropic.com
LLM_PROVIDER_MODEL=claude-sonnet-4-20250514
LOG_LEVEL=debug
INVITE_CODE_REQUIRED=false
```

### 5. Start Development Server

```bash
cd apps/portagent
bun dev
```

After the server starts, visit <http://localhost:5200>.

---

## Project Structure

```
apps/portagent/
├── src/
│   ├── client/                # Frontend code
│   │   ├── main.tsx          # Application entry
│   │   ├── App.tsx           # Route configuration
│   │   ├── input.css         # Tailwind entry
│   │   ├── hooks/
│   │   │   └── useAuth.tsx   # Authentication Hook
│   │   └── pages/
│   │       ├── LoginPage.tsx
│   │       ├── RegisterPage.tsx
│   │       └── ChatPage.tsx
│   │
│   ├── server/                # Backend code
│   │   ├── index.ts          # Server main entry
│   │   ├── main.ts           # Development entry
│   │   ├── auth.ts           # Authentication module
│   │   ├── logger.ts         # Logging module
│   │   ├── defaultAgent.ts   # Default Agent
│   │   ├── database/
│   │   │   └── SQLiteUserRepository.ts
│   │   └── user/
│   │       ├── types.ts
│   │       └── UserRepository.ts
│   │
│   └── cli/                   # CLI entry
│       └── index.ts
│
├── public/                    # Static assets
│   └── favicon.svg
│
├── build.ts                   # Build script
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── postcss.config.js
├── vite.config.ts
└── Dockerfile
```

---

## Development Modes

### Backend Development

Backend runs TypeScript directly with Bun:

```bash
cd apps/portagent
bun run src/server/main.ts
```

`main.ts` automatically loads `.env.local` and `.env`.

### Frontend Development

Frontend uses Vite development server:

```bash
cd apps/portagent
bun run dev:client
```

Vite development server runs on port 5173, automatically proxying API requests to the backend.

### Developing Frontend and Backend Together

Recommended to use two terminals:

```bash
# Terminal 1: Backend
cd apps/portagent && bun run src/server/main.ts

# Terminal 2: Frontend
cd apps/portagent && bun run dev:client
```

Or use the dev command from monorepo root:

```bash
# From repository root
bun dev portagent
```

---

## Build Process

### Development Build

```bash
cd apps/portagent
bun run build
```

### Build Artifacts

The build script (`build.ts`) performs the following steps:

1. **Clean**: Delete `dist` directory
2. **Frontend Build**: Bun bundles React application to `dist/public`
3. **CSS Generation**: PostCSS + Tailwind generates styles
4. **Generate index.html**: Inject bundled JS filename
5. **Binary Build**: Compile binaries for each platform

### Build Platforms

| Platform    | Binary File                 |
| ----------- | --------------------------- |
| macOS ARM64 | `portagent-darwin-arm64`    |
| macOS x64   | `portagent-darwin-x64`      |
| Linux x64   | `portagent-linux-x64`       |
| Linux ARM64 | `portagent-linux-arm64`     |
| Windows x64 | `portagent-windows-x64.exe` |

### Test Local Build

```bash
# Use CLI entry
node dist/cli.js --help

# Run binary directly (macOS ARM64 example)
./dist/bin/portagent-darwin-arm64 --help
```

---

## Code Standards

### TypeScript

- Use ESM modules (`"type": "module"`)
- Enable strict mode
- Imports use `.js` extension

### Naming Conventions

- **Files**: camelCase (`authRoutes.ts`)
- **Components**: PascalCase (`LoginPage.tsx`)
- **Functions**: camelCase (`createToken`)
- **Constants**: UPPER_SNAKE_CASE (`TOKEN_EXPIRY`)

### Logging

Use AgentX logger, do not use `console.*` directly:

```typescript
import { createLogger } from "@agentxjs/common";

const logger = createLogger("portagent/auth");
logger.info("User logged in", { userId });
```

---

## Adding New Features

### Add API Endpoint

In `src/server/index.ts`:

```typescript
// Public endpoint
app.get("/api/public/endpoint", (c) => {
  return c.json({ data: "public" });
});

// Protected endpoint
app.use("/api/private/*", authMiddleware);
app.get("/api/private/endpoint", (c) => {
  const userId = c.get("userId");
  return c.json({ data: "private", userId });
});
```

### Add Frontend Page

1. Create page component `src/client/pages/NewPage.tsx`:

```typescript
export function NewPage() {
  return <div>New Page</div>;
}
```

2. Add route in `src/client/App.tsx`:

```typescript
import { NewPage } from "./pages/NewPage";

<Routes>
  {/* ... other routes */}
  <Route path="/new" element={<ProtectedRoute><NewPage /></ProtectedRoute>} />
</Routes>
```

### Modify Default Agent

Edit `src/server/defaultAgent.ts`:

```typescript
export const defaultAgent: AgentDefinition = {
  name: "CustomAssistant",
  systemPrompt: `Your custom system prompt...`,
  mcpServers: {
    // Add MCP servers
    myMcp: {
      command: "my-mcp-server",
      args: ["--config", "/path/to/config"],
    },
  },
};
```

### Add User Fields

1. Update type definitions in `src/server/user/types.ts`:

```typescript
export interface UserRecord {
  // ... existing fields
  newField?: string;
}
```

2. Update database schema in `src/server/database/SQLiteUserRepository.ts`:

```typescript
private initDatabase(): void {
  this.db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      -- ... existing fields
      newField TEXT
    );
  `);
}
```

3. Update related methods.

---

## Debugging

### Backend Debugging

Use VS Code debug configuration:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "bun",
      "request": "launch",
      "name": "Debug Portagent",
      "program": "${workspaceFolder}/apps/portagent/src/server/main.ts",
      "cwd": "${workspaceFolder}/apps/portagent"
    }
  ]
}
```

### Frontend Debugging

Use browser developer tools:

1. Open <http://localhost:5173> (Vite development server)
2. Press F12 to open developer tools
3. Set breakpoints in Sources panel

### Log Debugging

Set `LOG_LEVEL=debug` to view detailed logs:

```bash
LOG_LEVEL=debug bun run src/server/main.ts
```

---

## Testing

### Run Tests

```bash
# From repository root
bun test

# Test only portagent
bun --filter @agentxjs/portagent test
```

### Type Checking

```bash
cd apps/portagent
bun run typecheck
```

### Code Linting

```bash
cd apps/portagent
bun run lint
```

---

## Docker Local Build

### Build Image

```bash
# From repository root
docker build -t portagent:local -f apps/portagent/Dockerfile .
```

### Run Local Image

```bash
docker run -d \
  --name portagent-dev \
  -p 5200:5200 \
  -e LLM_PROVIDER_KEY=sk-ant-xxx \
  portagent:local
```

### Use Locally Built Binary

```bash
# Build first
cd apps/portagent && bun run build

# Use local target
docker build --target local -t portagent:local-bin -f apps/portagent/Dockerfile .
```

---

## Release Process

### Create Changeset

```bash
bunx changeset
```

Select package and version type:

- `patch`: Bug fixes
- `minor`: New features
- `major`: Breaking changes (avoid if possible)

### Commit Changes

```bash
git add .changeset/
git commit -m "chore: add changeset"
git push
```

### CI Auto Release

After PR merge, CI will automatically:

1. Update version numbers
2. Build packages
3. Publish to npm
4. Build and push Docker image

---

## Common Issues

### Dependency Installation Failure

```bash
# Clean and reinstall
rm -rf node_modules
bun install
```

### Build Failure

```bash
# Clean build artifacts
bun clean

# Rebuild
bun build
```

### Type Errors

```bash
# Check types
bun run typecheck

# May need to rebuild dependent packages
cd ../.. && bun build
```

### Frontend Hot Reload Not Working

Ensure Vite is configured correctly, check `vite.config.ts`.

---

## Next Steps

- See [Architecture Design](./architecture.md) for code structure
- See [Operations Guide](./operations.md) for production deployment
