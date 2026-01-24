# Architecture Design

This document describes Portagent's system architecture, data models, and API design.

## System Architecture

### Overall Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                           Browser                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │
│  │  LoginPage  │  │ RegisterPage │  │  ChatPage   │                  │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                  │
│         │                │                │                          │
│         └────────────────┼────────────────┘                          │
│                          │                                           │
│                    ┌─────▼─────┐                                     │
│                    │ AuthContext│ (React Context)                    │
│                    └─────┬─────┘                                     │
│                          │                                           │
│              ┌───────────┴───────────┐                               │
│              │                       │                               │
│         HTTP │                  WebSocket                            │
│              │                       │                               │
└──────────────┼───────────────────────┼───────────────────────────────┘
               │                       │
               ▼                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Portagent Server                             │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                        Hono HTTP Server                       │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────────────┐  │   │
│  │  │   /health  │  │ /api/auth/* │  │    /agentx/*          │  │   │
│  │  │  (public)  │  │  (public)   │  │ (auth required)       │  │   │
│  │  └────────────┘  └──────┬─────┘  └──────────┬─────────────┘  │   │
│  │                         │                   │                 │   │
│  │                   ┌─────▼─────┐       ┌─────▼─────┐          │   │
│  │                   │ authRoutes │       │authMiddleware│       │   │
│  │                   └─────┬─────┘       └───────────┘          │   │
│  │                         │                                     │   │
│  │                   ┌─────▼─────┐                               │   │
│  │                   │UserRepository│                            │   │
│  │                   └─────┬─────┘                               │   │
│  │                         │                                     │   │
│  │                   ┌─────▼─────┐                               │   │
│  │                   │portagent.db│                              │   │
│  │                   └───────────┘                               │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                         AgentX                                │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────────────┐  │   │
│  │  │WebSocket /ws│  │ Containers │  │       Images          │  │   │
│  │  └──────┬─────┘  └──────┬─────┘  └──────────┬─────────────┘  │   │
│  │         │               │                    │                │   │
│  │         └───────────────┴────────────────────┘                │   │
│  │                         │                                     │   │
│  │                   ┌─────▼─────┐                               │   │
│  │                   │ agentx.db │                               │   │
│  │                   └───────────┘                               │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Claude API        │
                    │   (Anthropic)       │
                    └─────────────────────┘
```

### Three-Layer Architecture

| Layer            | Components           | Responsibilities                                |
| ---------------- | -------------------- | ----------------------------------------------- |
| **Presentation** | React Frontend       | User interface, authentication state management |
| **Business**     | Hono Server + AgentX | HTTP routing, authentication, Agent management  |
| **Data**         | SQLite               | User data, session data, event storage          |

---

## Server Architecture

### Core Modules

```
src/server/
├── index.ts           # Server entry, route configuration
├── main.ts            # Development entry (loads .env)
├── auth.ts            # Authentication module (JWT, invitation code)
├── logger.ts          # Logging module (LogTape adapter)
├── defaultAgent.ts    # Default Agent configuration
├── database/
│   ├── index.ts       # Database exports
│   └── SQLiteUserRepository.ts  # User data access
└── user/
    ├── types.ts       # User type definitions
    ├── UserRepository.ts  # User repository interface
    └── index.ts       # User module exports
```

### Request Processing Flow

```
HTTP Request
     │
     ▼
┌─────────────┐
│    CORS     │  Allow cross-origin requests
└─────┬───────┘
      │
      ▼
┌─────────────────────────────────────────────────┐
│                    Route Dispatch                │
├──────────────┬──────────────┬───────────────────┤
│   /health    │  /api/auth/* │    /agentx/*      │
│   (public)   │   (public)   │  (auth required)  │
└──────────────┴──────┬───────┴────────┬──────────┘
                      │                │
                      ▼                ▼
               ┌──────────┐     ┌─────────────┐
               │authRoutes│     │authMiddleware│
               └──────────┘     └──────┬──────┘
                                       │
                                       ▼
                                ┌──────────────┐
                                │ AgentX Routes │
                                └──────────────┘
```

### WebSocket Handling

WebSocket connections are handled by AgentX at the `/ws` path:

```typescript
const agentx = await createAgentX({
  llm: { apiKey, baseUrl, model },
  server, // HTTP server instance
  // WebSocket automatically enabled at /ws path
});
```

---

## User-Container Relationship Model

### Concept

Each user owns a dedicated Container, which serves as the isolation boundary for Agents.

```
┌─────────────────────────────────────────────────────────┐
│                      User (john)                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │              Container (user-uuid-xxx)             │  │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐           │  │
│  │  │  Image  │  │  Image  │  │  Image  │           │  │
│  │  │(Assistant)│ │ (Coder) │  │(Translator)│        │  │
│  │  └────┬────┘  └────┬────┘  └────┬────┘           │  │
│  │       │            │            │                 │  │
│  │  ┌────▼────┐  ┌────▼────┐  ┌────▼────┐           │  │
│  │  │ Session │  │ Session │  │ Session │           │  │
│  │  └─────────┘  └─────────┘  └─────────┘           │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Data Flow

1. **On Registration**: Create User record -> Create Container -> Associate `containerId`
2. **After Login**: Return `containerId` to frontend
3. **Create Session**: Frontend uses `containerId` to create Image/Session

### Code Implementation

```typescript
// Create Container on registration
const containerId = `user-${crypto.randomUUID()}`;
const containerRes = await agentx.request("container_create_request", { containerId });

// Associate Container when creating user
const user = await userRepository.createUser({
  username,
  password,
  containerId,
  // ...
});
```

---

## Database Schema

### portagent.db (User Data)

```sql
CREATE TABLE users (
  userId TEXT PRIMARY KEY,            -- UUID
  username TEXT UNIQUE NOT NULL,      -- Login username
  email TEXT UNIQUE NOT NULL,         -- Email
  passwordHash TEXT NOT NULL,         -- bcrypt hash
  containerId TEXT NOT NULL,          -- Associated Container ID
  displayName TEXT,                   -- Display name
  avatar TEXT,                        -- Avatar URL
  isActive INTEGER NOT NULL DEFAULT 1,-- Account status
  createdAt INTEGER NOT NULL,         -- Creation timestamp
  updatedAt INTEGER NOT NULL          -- Update timestamp
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_containerId ON users(containerId);
```

### agentx.db (AgentX Data)

Managed by AgentX, contains:

- `containers` - Container records
- `images` - Image records
- `sessions` - Session records
- `messages` - Message records

---

## API Endpoints

### Public Endpoints

| Method | Path                 | Description                         |
| ------ | -------------------- | ----------------------------------- |
| GET    | `/health`            | Health check                        |
| GET    | `/api/auth/config`   | Get authentication configuration    |
| POST   | `/api/auth/register` | User registration                   |
| POST   | `/api/auth/login`    | User login                          |
| POST   | `/api/auth/logout`   | User logout (client-side operation) |

### Protected Endpoints

| Method | Path               | Description          |
| ------ | ------------------ | -------------------- |
| GET    | `/api/auth/verify` | Verify Token         |
| GET    | `/agentx/info`     | Get platform info    |
| WS     | `/ws`              | WebSocket connection |

### Health Check

```
GET /health

Response:
{
  "status": "ok",
  "timestamp": 1736899200000
}
```

### Authentication Configuration

```
GET /api/auth/config

Response:
{
  "inviteCodeRequired": true
}
```

### Platform Info

```
GET /agentx/info
Authorization: Bearer <token>

Response:
{
  "version": "0.1.0",
  "wsPath": "/ws"
}
```

---

## WebSocket Protocol

### Connection

```javascript
const token = getAuthToken();
const ws = new WebSocket(`ws://localhost:5200/ws?token=${token}`);
```

### Message Format

AgentX uses JSON-RPC style message format:

**Request**:

```json
{
  "id": "req-uuid",
  "type": "agent_receive_request",
  "data": {
    "agentId": "agent-uuid",
    "content": "Hello!"
  }
}
```

**Response**:

```json
{
  "id": "req-uuid",
  "type": "agent_receive_response",
  "data": {
    "success": true
  }
}
```

**Event**:

```json
{
  "type": "text_delta",
  "data": {
    "text": "Hello"
  },
  "context": {
    "agentId": "agent-uuid",
    "sessionId": "session-uuid"
  }
}
```

### Event Types

| Event Type         | Description      |
| ------------------ | ---------------- |
| `message_start`    | Message start    |
| `text_delta`       | Text delta       |
| `tool_use_start`   | Tool call start  |
| `tool_result`      | Tool result      |
| `message_stop`     | Message end      |
| `conversation_end` | Conversation end |

---

## Frontend Architecture

### Component Structure

```
src/client/
├── main.tsx           # Application entry
├── App.tsx            # Route configuration
├── input.css          # Tailwind entry
├── hooks/
│   └── useAuth.tsx    # Authentication Hook
└── pages/
    ├── LoginPage.tsx  # Login page
    ├── RegisterPage.tsx  # Registration page
    └── ChatPage.tsx   # Chat page (main interface)
```

### Route Design

```typescript
<Routes>
  <Route path="/login" element={<LoginPage />} />
  <Route path="/register" element={<RegisterPage />} />
  <Route path="/studio" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
  <Route path="/" element={<Navigate to="/studio" />} />
  <Route path="*" element={<Navigate to="/studio" />} />
</Routes>
```

### Authentication Context

```typescript
interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  user: UserInfo | null;
  login: (usernameOrEmail: string, password: string) => Promise<Result>;
  register: (username: string, password: string, inviteCode: string, ...) => Promise<Result>;
  logout: () => void;
}
```

### UI Components

ChatPage uses the `ResponsiveStudio` component from `@agentxjs/ui`:

```typescript
<ResponsiveStudio agentx={agentx} containerId={user.containerId} />
```

---

## Logging Architecture

### LogTape Integration

Portagent uses LogTape as the logging backend:

```typescript
const loggerFactory = new LogTapeLoggerFactory({
  level: logLevel, // debug/info/warn/error
  logDir: paths.logsDirPath,
  pretty: process.env.NODE_ENV !== "production",
});
```

### Log Output

- **Console**: Formatted output (development environment)
- **File**: Rotating logs (production environment)
  - Maximum 10MB per file
  - Retain 7 files

### Log Level Mapping

| AgentX Level | LogTape Level |
| ------------ | ------------- |
| debug        | debug         |
| info         | info          |
| warn         | warning       |
| error        | error         |

---

## Build Artifacts

### Directory Structure

```
dist/
├── bin/                      # Platform binaries
│   ├── portagent-darwin-arm64
│   ├── portagent-darwin-x64
│   ├── portagent-linux-x64
│   ├── portagent-linux-arm64
│   └── portagent-windows-x64.exe
├── public/                   # Static assets
│   ├── index.html
│   ├── favicon.svg
│   └── assets/
│       ├── main-[hash].js
│       └── styles.css
├── claude-code/              # Claude Code SDK
└── cli.js                    # CLI entry
```

### Build Process

1. **Frontend Build**: Bun bundles React application
2. **CSS Generation**: PostCSS + Tailwind generates styles
3. **Generate index.html**: Inject bundled JS filename
4. **Binary Build**: Bun --compile generates platform binaries
5. **Claude Code Packaging**: Copy SDK to dist

---

## Extension Points

### Custom Agent

Modify `src/server/defaultAgent.ts`:

```typescript
export const defaultAgent: AgentDefinition = {
  name: "CustomAssistant",
  systemPrompt: "Your custom system prompt",
  mcpServers: {
    // Add custom MCP servers
  },
};
```

### Add Routes

In `src/server/index.ts`:

```typescript
// Public route
app.get("/api/custom", (c) => c.json({ data: "custom" }));

// Protected route
app.use("/api/protected/*", authMiddleware);
app.get("/api/protected/data", (c) => {
  const userId = c.get("userId");
  return c.json({ userId });
});
```

---

## Next Steps

- See [Development Guide](./development.md) for local development
- See [Operations Guide](./operations.md) for production operations
