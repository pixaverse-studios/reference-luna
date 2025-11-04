# Environment Variables Configuration

Create a `.env.local` file in the root of your project:

```bash
# Luna API Configuration
BACKEND_URL=https://fal.run/Pixa-AI/luna-next
AUTH_KEY=your_luna_api_key_here
```

## Instructions

1. Copy the content above
2. Create a file named `.env.local` in the root of your project
3. Replace `your_luna_api_key_here` with your actual Luna API key
4. Save the file
5. Restart your Next.js development server

## Variable Descriptions

### `BACKEND_URL`
- Your Luna backend server URL
- Example: `https://fal.run/Pixa-AI/luna-next` (production)
- Example: `https://your-custom-deployment.com` (self-hosted)
- Used by all API routes to connect to Luna
- Do not include trailing slash

### `AUTH_KEY`
- Your Luna API authentication key
- Used server-side only (never exposed to browser)
- Required for both connection methods:
  - **Ephemeral Token Method**: Generates short-lived tokens
  - **Direct Method**: Used directly in API calls
- Keep this secure and never commit it to version control

## Connection Methods

This demo supports **two connection methods**:

### 🔐 Ephemeral Token Method (Recommended for Production)

**Flow:**
1. Server generates ephemeral token using your `AUTH_KEY`
2. Client uses ephemeral token (expires in 5 min, one-time use)
3. Your main API key never leaves the server

**Security:**
- ✅ Main API key stays server-side
- ✅ Short-lived tokens (5 minutes)
- ✅ One-time use only
- ✅ Session config controlled server-side

### 🔓 Direct Method (Good for Development)

**Flow:**
1. Client sends config to server
2. Server makes direct API call with `AUTH_KEY`
3. Returns result to client

**Security:**
- ✅ API key still server-side (secure)
- ⚠️ Client controls session config
- ⚠️ No token expiration

## Security Notes

⚠️ **IMPORTANT**: 
- Never commit `.env.local` to version control
- The `.env.local` file is already in `.gitignore`
- All sensitive credentials are server-side only (no `NEXT_PUBLIC_` prefix)
- API requests are proxied through Next.js API routes

## After Setting Up

Restart your development server:
```bash
npm run dev
# or
yarn dev
# or
bun dev
```

The application will automatically pick up the environment variables.

## API Endpoints

### Ephemeral Token Generation
```
${BACKEND_URL}/v1/realtime/client_secrets
```

### WebRTC Connection
```
${BACKEND_URL}/v1/realtime/calls
```

Both use `X-Luna-Key` header for authentication.
