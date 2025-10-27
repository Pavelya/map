# Admin Authentication & Authorization System

This document describes the JWT-based authentication system for admin users in the Team Vote Map application.

## Overview

The authentication system provides secure access control for administrative functions using:
- **bcryptjs** for password hashing (12+ salt rounds)
- **jsonwebtoken** for JWT token generation and verification
- **Redis** for session management and tracking
- **Winston** logger for security event logging

## Architecture

### Components

1. **Auth Utilities** ([src/lib/auth-utils.ts](../src/lib/auth-utils.ts))
   - Password hashing and verification
   - JWT token generation (access & refresh)
   - Token verification and validation
   - Authorization header parsing

2. **Session Management** ([src/lib/session.ts](../src/lib/session.ts))
   - Redis-based session storage
   - Session validation and revocation
   - TTL management (1 hour for access tokens)

3. **Auth Service** ([src/services/auth-service.ts](../src/services/auth-service.ts))
   - Admin user creation and management
   - Authentication logic
   - Password change functionality
   - Token refresh mechanism

4. **Auth Middleware** ([src/middleware/auth.ts](../src/middleware/auth.ts))
   - Request authentication
   - Token extraction from headers/cookies
   - Admin data attachment to requests

5. **API Endpoints**
   - `POST /api/admin/auth/login` - Admin login
   - `POST /api/admin/auth/logout` - Admin logout
   - `POST /api/admin/auth/refresh` - Refresh access token
   - `GET /api/admin/me` - Get current admin (protected)

## Environment Variables

Required environment variables (see [.env.example](../.env.example)):

```bash
# JWT Secrets (generate with: openssl rand -base64 32)
JWT_SECRET=your-secret-key-here
JWT_REFRESH_SECRET=your-refresh-secret-key-here

# Password Hashing (minimum 12 rounds)
ADMIN_PASSWORD_SALT_ROUNDS=12
```

## Password Requirements

Passwords must meet the following criteria:
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

## Token Lifecycle

### Access Token
- **Expiration**: 1 hour
- **Purpose**: Authenticate API requests
- **Storage**: HTTP-only cookie + returned in response
- **Claims**: adminId, username, type='access'

### Refresh Token
- **Expiration**: 7 days
- **Purpose**: Generate new access tokens
- **Storage**: HTTP-only cookie only
- **Claims**: adminId, type='refresh'

## Authentication Flow

### 1. Login

```bash
POST /api/admin/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "StrongPassword123!"
}
```

**Response (200 OK):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "admin": {
    "id": "uuid",
    "username": "admin",
    "email": "admin@example.com"
  }
}
```

**Cookies Set:**
- `access_token` (HttpOnly, 1 hour)
- `refresh_token` (HttpOnly, 7 days)

**Rate Limiting:**
- 5 attempts per 15 minutes per IP
- 5 attempts per 15 minutes per username

### 2. Accessing Protected Routes

Include the access token in one of two ways:

**Option 1: Authorization Header (Recommended)**
```bash
GET /api/admin/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Option 2: Cookie (Automatic)**
```bash
GET /api/admin/me
Cookie: access_token=eyJhbGciOiJIUzI1NiIs...
```

### 3. Refresh Token

When the access token expires, use the refresh token to get a new one:

```bash
POST /api/admin/auth/refresh
Cookie: refresh_token=eyJhbGciOiJIUzI1NiIs...
```

**Response (200 OK):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

### 4. Logout

```bash
POST /api/admin/auth/logout
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Response (200 OK):**
```json
{
  "message": "Logged out successfully"
}
```

**Actions:**
- Session revoked in Redis
- Cookies cleared

## Session Management

Sessions are stored in Redis with the following structure:

**Key Format:** `session:{adminId}:{tokenHash}`

**Data:**
```json
{
  "adminId": "uuid",
  "createdAt": "2025-01-01T00:00:00.000Z",
  "username": "admin",
  "loginAt": "2025-01-01T00:00:00.000Z"
}
```

**TTL:** 3600 seconds (1 hour)

### Session Validation

Every authenticated request validates:
1. JWT signature and expiration
2. Session exists in Redis
3. Admin user exists in database

## Creating Admin Users

Use the provided CLI script to create admin users:

```bash
pnpm create-admin
```

The script will prompt for:
- Username (3+ characters, alphanumeric + underscore/hyphen)
- Email (valid email format)
- Password (must meet requirements)
- Password confirmation

**Example:**
```bash
$ pnpm create-admin

==================================================
Admin User Creation Script
==================================================

Enter username: admin
Enter email: admin@example.com
Enter password: ********
Confirm password: ********

Creating admin user...

==================================================
Admin user created successfully!
==================================================

Admin Details:
  ID:       550e8400-e29b-41d4-a716-446655440000
  Username: admin
  Email:    admin@example.com
  Created:  2025-01-01T00:00:00.000Z

You can now use these credentials to log in.
```

## Security Features

### 1. Password Security
- **Hashing**: bcrypt with 12+ salt rounds
- **Validation**: Strong password requirements
- **Storage**: Only hashed passwords stored in database

### 2. Token Security
- **Signatures**: HMAC-SHA256 with separate secrets
- **Expiration**: Short-lived access tokens (1 hour)
- **Rotation**: Refresh token mechanism
- **HttpOnly Cookies**: Prevents XSS attacks
- **Secure Flag**: HTTPS-only in production

### 3. Session Security
- **Redis Storage**: Centralized session management
- **TTL Enforcement**: Automatic expiration
- **Revocation**: Immediate session termination on logout
- **Session Validation**: Every request verified

### 4. Rate Limiting
- **Login Attempts**: 5 per 15 minutes (by IP and username)
- **Brute Force Protection**: Redis-based tracking
- **Automatic Cleanup**: TTL-based expiration

### 5. Security Logging
- All authentication attempts logged
- Failed login attempts tracked
- Token generation/verification logged
- Session lifecycle events recorded

## Error Handling

### Common Error Responses

**401 Unauthorized**
```json
{
  "error": "Authentication required"
}
```

**401 Invalid Credentials**
```json
{
  "error": "Invalid credentials"
}
```

**429 Too Many Requests**
```json
{
  "error": "Too many login attempts. Please try again later.",
  "retryAfter": 900
}
```

**500 Internal Server Error**
```json
{
  "error": "Internal server error"
}
```

## Testing

Run the validation suite to test all authentication components:

```bash
pnpm validate-task8
```

The test suite validates:
- Password hashing (bcrypt, 12+ rounds)
- Password strength validation
- JWT token generation and verification
- Session management (create, validate, revoke)
- Admin creation and duplicate prevention
- Authentication flow (login, token refresh, logout)
- Rate limiting configuration

## Database Schema

The authentication system uses the `admin_users` table:

```sql
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_admin_users_username ON admin_users(username);
CREATE INDEX idx_admin_users_email ON admin_users(email);
```

## Best Practices

### For Frontend Integration

1. **Store tokens securely**
   - Use HttpOnly cookies (automatic)
   - Don't store in localStorage (XSS risk)

2. **Handle token expiration**
   - Implement automatic refresh before expiration
   - Graceful redirect to login on 401

3. **Include tokens in requests**
   - Use Authorization header for API calls
   - Cookies sent automatically

### For Backend Development

1. **Protect admin routes**
   ```typescript
   import { requireAuthOrThrow } from '@/middleware/auth';

   export async function GET(request: NextRequest) {
     const admin = await requireAuthOrThrow(request);
     // Route is now protected
   }
   ```

2. **Log security events**
   ```typescript
   import { logger } from '@/lib/logger';

   logger.info('Security event', { adminId, action });
   ```

3. **Validate input**
   - Always validate user input
   - Use password strength validation
   - Sanitize error messages

## Troubleshooting

### "JWT_SECRET must be set"
- Ensure `.env` file exists
- Check `JWT_SECRET` and `JWT_REFRESH_SECRET` are set
- Restart development server

### "Invalid or expired token"
- Token may have expired (1 hour)
- Use refresh token to get new access token
- Check Redis connection

### "Session not found"
- Session may have been revoked
- Redis may be down or cleared
- Re-login required

### "Rate limit exceeded"
- Wait 15 minutes before retrying
- Check Redis for login attempt keys
- Clear keys manually if needed: `login_attempts:*`

## Additional Resources

- [Product Specifications - Section 9.2 (Authentication)](../.vscode/docs/team-vote-map-product-specs-v2.md)
- [Security Measures - Section 6.2](../.vscode/docs/team-vote-map-product-specs-v2.md)
- [JWT.io](https://jwt.io/) - JWT debugger
- [bcrypt documentation](https://github.com/kelektiv/node.bcrypt.js)
