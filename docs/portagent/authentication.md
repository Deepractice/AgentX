# Authentication System

This document provides detailed information about Portagent's authentication mechanism, including JWT authentication and invitation code system.

## Authentication Overview

Portagent uses JWT (JSON Web Token) for user authentication:

1. Users receive a JWT Token after registration/login
2. Subsequent requests carry the Token for identity verification
3. Token validity period is 7 days

---

## JWT Authentication Mechanism

### Token Structure

Portagent uses JWT signed with HS256 algorithm:

```json
{
  "header": {
    "alg": "HS256"
  },
  "payload": {
    "sub": "user-uuid", // User ID
    "iat": 1704067200, // Issued at
    "exp": 1704672000 // Expires (7 days later)
  }
}
```

### Token Lifecycle

| Phase      | Description                                         |
| ---------- | --------------------------------------------------- |
| Issuance   | Returned after successful registration or login     |
| Validity   | 7 days                                              |
| Validation | Verify signature and expiration on each request     |
| Refresh    | No auto-refresh; re-login required after expiration |

### HTTP Authentication

Carry the Token in request headers:

```http
Authorization: Bearer <token>
```

Example:

```bash
curl -X GET http://localhost:5200/api/auth/verify \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### WebSocket Authentication

WebSocket doesn't support custom headers, so Token is passed via query parameter:

```
ws://localhost:5200/ws?token=<token>
```

### JWT Key Configuration

**Production environments must configure a fixed JWT_SECRET**:

```bash
# Generate secure key
openssl rand -base64 32

# Set environment variable
export JWT_SECRET=your-secure-random-secret-at-least-32-chars
```

If `JWT_SECRET` is not set:

- System automatically generates a random key
- All users need to re-login after each restart
- Not suitable for production environments

---

## Invitation Code System

Portagent uses time-based invitation codes to control user registration.

### How It Works

The invitation code is the **Unix timestamp (in seconds) of 00:00:01 on the current day**:

1. Automatically changes at midnight each day
2. Calculated based on server timezone
3. Docker containers default to UTC timezone

### Enable Invitation Code

```bash
# Environment variable
INVITE_CODE_REQUIRED=true

# Docker
docker run -e INVITE_CODE_REQUIRED=true ...

# CLI
portagent --invite-code-required
```

### Calculate Invitation Code

#### Linux/macOS

```bash
# Server local timezone
date -d "today 00:00:01" +%s

# UTC timezone (Docker default)
TZ=UTC date -d "today 00:00:01" +%s
```

macOS syntax:

```bash
# Server local timezone
date -j -f "%Y-%m-%d %H:%M:%S" "$(date +%Y-%m-%d) 00:00:01" "+%s"

# UTC timezone
TZ=UTC date -j -f "%Y-%m-%d %H:%M:%S" "$(TZ=UTC date +%Y-%m-%d) 00:00:01" "+%s"
```

#### JavaScript/Node.js

```javascript
// Server local timezone
const now = new Date();
const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 1);
const inviteCode = Math.floor(todayStart.getTime() / 1000);
console.log(inviteCode);
```

```javascript
// UTC timezone
const now = new Date();
const utcTodayStart = new Date(
  Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 1)
);
const inviteCode = Math.floor(utcTodayStart.getTime() / 1000);
console.log(inviteCode);
```

#### Python

```python
from datetime import datetime, timezone

# Server local timezone
now = datetime.now()
today_start = now.replace(hour=0, minute=0, second=1, microsecond=0)
invite_code = int(today_start.timestamp())
print(invite_code)

# UTC timezone
now_utc = datetime.now(timezone.utc)
utc_today_start = now_utc.replace(hour=0, minute=0, second=1, microsecond=0)
invite_code = int(utc_today_start.timestamp())
print(invite_code)
```

### Timezone Considerations

**Docker containers run in UTC timezone by default**.

Example (assuming current Beijing time is 2025-01-15 10:00):

| Timezone        | Date             | Invitation Code                        |
| --------------- | ---------------- | -------------------------------------- |
| UTC             | 2025-01-15 02:00 | `1736899201` (2025-01-15 00:00:01 UTC) |
| Beijing (UTC+8) | 2025-01-15 10:00 | `1736870401` (2025-01-15 00:00:01 CST) |

If client and server are in different timezones, ensure the invitation code is calculated using the server timezone.

### Validation Logic

Server-side validation code:

```typescript
function isValidInviteCode(code: string): boolean {
  const timestamp = parseInt(code, 10);
  if (isNaN(timestamp)) return false;

  // Get today 00:00:01 in server timezone
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 1);
  const expectedTimestamp = Math.floor(todayStart.getTime() / 1000);

  return timestamp === expectedTimestamp;
}
```

---

## User Registration Flow

### API Endpoint

```
POST /api/auth/register
```

### Request Format

```json
{
  "username": "john", // Required, at least 3 characters
  "password": "secret123", // Required, at least 6 characters
  "inviteCode": "1736899201", // Required when enabled
  "email": "john@example.com", // Optional
  "displayName": "John Doe" // Optional
}
```

### Success Response

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "userId": "uuid-xxx",
    "username": "john",
    "email": "john@example.com",
    "containerId": "user-uuid-xxx",
    "displayName": "John Doe",
    "createdAt": 1736899200000
  },
  "expiresIn": "7d"
}
```

### Error Responses

```json
// Username already exists
{ "error": "Username 'john' already exists" }

// Email already exists
{ "error": "Email 'john@example.com' already exists" }

// Invalid invitation code
{ "error": "Invalid invite code" }

// Username too short
{ "error": "Username must be at least 3 characters" }

// Password too short
{ "error": "Password must be at least 6 characters" }
```

### Example

```bash
curl -X POST http://localhost:5200/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john",
    "password": "secret123",
    "inviteCode": "1736899201",
    "email": "john@example.com",
    "displayName": "John Doe"
  }'
```

---

## User Login Flow

### API Endpoint

```
POST /api/auth/login
```

### Request Format

```json
{
  "usernameOrEmail": "john", // Username or email
  "password": "secret123"
}
```

### Success Response

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "userId": "uuid-xxx",
    "username": "john",
    "email": "john@example.com",
    "containerId": "user-uuid-xxx",
    "displayName": "John Doe",
    "createdAt": 1736899200000
  },
  "expiresIn": "7d"
}
```

### Error Response

```json
{ "error": "Invalid credentials" }
```

### Example

```bash
curl -X POST http://localhost:5200/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "usernameOrEmail": "john",
    "password": "secret123"
  }'
```

---

## Token Verification

### API Endpoint

```
GET /api/auth/verify
```

### Request

```bash
curl -X GET http://localhost:5200/api/auth/verify \
  -H "Authorization: Bearer <token>"
```

### Success Response

```json
{
  "valid": true,
  "user": {
    "userId": "uuid-xxx",
    "username": "john",
    "email": "john@example.com",
    "containerId": "user-uuid-xxx",
    "displayName": "John Doe",
    "createdAt": 1736899200000
  }
}
```

### Failure Response

```json
{ "valid": false }
```

---

## Authentication Configuration Query

Get server authentication configuration (public endpoint):

```
GET /api/auth/config
```

Response:

```json
{
  "inviteCodeRequired": true
}
```

The frontend can use this configuration to decide whether to display the invitation code input field.

---

## User Data Model

### Database Table Structure

```sql
CREATE TABLE users (
  userId TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  passwordHash TEXT NOT NULL,
  containerId TEXT NOT NULL,
  displayName TEXT,
  avatar TEXT,
  isActive INTEGER NOT NULL DEFAULT 1,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);
```

### User-Container Relationship

- Each user automatically gets a dedicated Container upon registration
- `containerId` format: `user-{uuid}`
- All user sessions and Agents are within this Container

### Password Storage

- Uses bcrypt algorithm for hashing
- Cost factor: 10

---

## Frontend Authentication Flow

### Storage

Token and user information are stored in localStorage:

```javascript
localStorage.setItem("portagent_token", token);
localStorage.setItem("portagent_user", JSON.stringify(user));
```

### Initialization Check

Validate stored Token on page load:

```javascript
const storedToken = localStorage.getItem("portagent_token");
if (storedToken) {
  const result = await fetch("/api/auth/verify", {
    headers: { Authorization: `Bearer ${storedToken}` },
  });
  if (!result.ok) {
    // Token invalid, clear and redirect to login
    localStorage.removeItem("portagent_token");
    localStorage.removeItem("portagent_user");
    navigate("/login");
  }
}
```

### Logout

Logout is a client-side operation:

```javascript
function logout() {
  localStorage.removeItem("portagent_token");
  localStorage.removeItem("portagent_user");
  navigate("/login");
}
```

---

## Security Recommendations

### 1. JWT Key Security

```bash
# Use strong random key
JWT_SECRET=$(openssl rand -base64 32)

# Do not hardcode in source code
# Use environment variables or secrets management
```

### 2. HTTPS

Production environments must use HTTPS to prevent Token theft.

### 3. Token Storage

- Using localStorage (current implementation)
- Consider using httpOnly cookies for enhanced security

### 4. Invitation Code Distribution

- Distribute invitation codes through secure channels
- Daily automatic rotation increases security

---

## Next Steps

- See [Architecture Design](./architecture.md) for authentication middleware implementation
- See [Troubleshooting](./troubleshooting.md) for authentication issues
