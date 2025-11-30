# Luna API Connection Methods

This reference implementation demonstrates **TWO ways** to connect to Luna's API. Choose based on your security requirements.

## 🔐 Method 1: Ephemeral Token (RECOMMENDED for Production)

### Overview
A 2-step process that generates short-lived, one-time-use tokens. Your main API key never leaves your server.

### Flow Diagram
```
Browser                Next.js API           Luna API
  │                         │                    │
  │ 1. Request token        │                    │
  │────────────────────────>│                    │
  │                         │                    │
  │                         │ 2. Generate token  │
  │                         │   POST /v1/realtime/client_secrets
  │                         │   X-Luna-Key: Bearer MAIN_KEY
  │                         │   { session config }
  │                         │───────────────────>│
  │                         │                    │
  │                         │ 3. Ephemeral token │
  │                         │   { value, expires_at }
  │                         │<───────────────────│
  │ 4. Return token         │                    │
  │<────────────────────────│                    │
  │                         │                    │
  │ 5. WebRTC offer         │                    │
  │   + ephemeral token     │                    │
  │────────────────────────>│                    │
  │                         │                    │
  │                         │ 6. Establish WebRTC│
  │                         │   POST /v1/realtime/calls
  │                         │   X-Luna-Key: Bearer EPH_TOKEN
  │                         │   SDP offer        │
  │                         │───────────────────>│
  │                         │                    │
  │                         │ 7. SDP answer      │
  │                         │<───────────────────│
  │ 8. SDP answer           │                    │
  │<────────────────────────│                    │
  │                         │                    │
  │ 9. WebRTC connected     │                    │
  │<────────────────────────────────────────────>│
```

### Implementation

**Step 1: Generate Ephemeral Token**

```typescript
// POST /api/ephemeral-key
const response = await fetch('/api/ephemeral-key', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    custom_prompt: 'You are a helpful AI...',
    temperature: 0.8,
    top_p: 0.95,
    top_k: 50,
    vad_threshold: 0.5,
    vad_prefix_padding_ms: 300,
    vad_silence_duration_ms: 500,
  })
});

const { value, expires_at } = await response.json();
// value: "eph_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
// expires_at: 1762334271 (Unix timestamp)
```

**Server-side (`/api/ephemeral-key`):**
```typescript
const response = await fetch('https://fal.run/Pixa-AI/luna-next/v1/realtime/client_secrets', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Luna-Key': `Bearer ${process.env.AUTH_KEY}`,  // Main API key
  },
  body: JSON.stringify({ session: { /* config */ } })
});
```

**Step 2: Use Ephemeral Token for WebRTC**

```typescript
// POST /api/offer
const response = await fetch('/api/offer', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sdp: sdpOffer,
    ephemeral_token: ephemeralToken  // Use ephemeral token
  })
});

const sdpAnswer = await response.text();
```

**Server-side (`/api/offer`):**
```typescript
const response = await fetch('https://fal.run/Pixa-AI/luna-next/v1/realtime/calls', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/sdp',
    'X-Luna-Key': `Bearer ${ephemeral_token}`,  // Ephemeral token
  },
  body: sdp  // Raw SDP string
});
```

### Security Benefits

✅ **Maximum Security**
- Main API key **never** exposed to client
- Token expires in 5 minutes
- One-time use (revoked after first call)
- Server controls session configuration
- Client can't modify model/settings without server approval

✅ **Best For:**
- Production deployments
- Public-facing applications
- Multi-tenant systems
- When you need fine-grained control

---

## 🔓 Method 2: Direct API Key (Good for Development)

### Overview
A simpler 1-step process where the server uses the main API key directly.

### Flow Diagram
```
Browser                Next.js API           Luna API
  │                         │                    │
  │ 1. SDP offer            │                    │
  │   + session config      │                    │
  │────────────────────────>│                    │
  │                         │                    │
  │                         │ 2. WebRTC call     │
  │                         │   POST /v1/realtime/calls
  │                         │   X-Luna-Key: Bearer MAIN_KEY
  │                         │   FormData(sdp, session)
  │                         │───────────────────>│
  │                         │                    │
  │                         │ 3. SDP answer      │
  │                         │<───────────────────│
  │ 4. SDP answer           │                    │
  │<────────────────────────│                    │
  │                         │                    │
  │ 5. WebRTC connected     │                    │
  │<────────────────────────────────────────────>│
```

### Implementation

**Single Step: Send SDP with Config**

```typescript
// POST /api/offer-direct
const response = await fetch('/api/offer-direct', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sdp: sdpOffer,
    custom_prompt: 'You are a helpful AI...',
    temperature: 0.8,
    top_p: 0.95,
    top_k: 50,
    vad_threshold: 0.5,
    vad_prefix_padding_ms: 300,
    vad_silence_duration_ms: 500,
  })
});

const sdpAnswer = await response.text();
```

**Server-side (`/api/offer-direct`):**
```typescript
const formData = new FormData();
formData.append('sdp', sdp);
formData.append('session', JSON.stringify(sessionConfig));

const response = await fetch('https://fal.run/Pixa-AI/luna-next/v1/realtime/calls', {
  method: 'POST',
  headers: {
    'X-Luna-Key': `Bearer ${process.env.AUTH_KEY}`,  // Main API key
  },
  body: formData
});
```

### Security Considerations

✅ **Still Secure (API key is server-side)**
- Main API key never exposed to browser
- All requests proxied through Next.js

⚠️ **Less Control**
- Client can change session config freely
- No token expiration
- Each connection uses main API key

✅ **Best For:**
- Development and testing
- Internal tools
- Trusted environments
- Simpler implementation

---

## 📊 Comparison Table

| Feature | Ephemeral Token 🔐 | Direct API 🔓 |
|---------|-------------------|--------------|
| **Security Level** | Maximum | Good |
| **Steps Required** | 2 steps | 1 step |
| **Token Expiry** | 5 minutes | No expiry |
| **Token Reuse** | One-time use | Unlimited |
| **API Key Exposure** | Never exposed | Server-side only |
| **Session Control** | Server-controlled | Client-controlled |
| **Best For** | Production | Development |
| **Complexity** | Higher | Lower |
| **API Calls** | 2 per connection | 1 per connection |

---

## 🎯 Which Method Should You Use?

### Use **Ephemeral Token** When:
- ✅ Building production applications
- ✅ App is public-facing
- ✅ Need maximum security
- ✅ Want server-side session control
- ✅ Have rate limiting concerns
- ✅ Need audit trail of token generation

### Use **Direct Method** When:
- ✅ Rapid prototyping
- ✅ Internal tools
- ✅ Development environment
- ✅ Simplicity is priority
- ✅ You trust the client application
- ✅ Single-tenant application

---

## 🧪 Testing Both Methods

In this demo app:

1. **Select connection method** before connecting
2. **Click the connect button** (color-coded: green = ephemeral, orange = direct)
3. **Watch the console** - different log messages for each method
4. **Check Event Log** - see the connection flow
5. **Both methods work identically** once connected

### Console Output Examples

**Ephemeral Method:**
```
🔐 Ephemeral Method - Step 1: Requesting ephemeral token...
✅ Ephemeral token received (expires: 12:50:30 PM)
🔐 Ephemeral Method - Step 2: Sending SDP offer with ephemeral token...
✅ WebRTC connection established (SECURE ephemeral token flow)
```

**Direct Method:**
```
🔓 Direct Method - Sending SDP offer with API key...
✅ WebRTC connection established (direct API key flow)
```

---

## 💡 Migration Path

Start with **Direct Method** for quick development, then switch to **Ephemeral Token** for production:

```typescript
// Development
const method = 'direct';  // Quick and simple

// Production
const method = 'ephemeral';  // Secure and controlled
```

The beauty of this demo is you can **toggle between both** to understand the tradeoffs!

---

## 📚 Code References

- **Ephemeral Token Generation**: `pages/api/ephemeral-key.ts`
- **Ephemeral Token Connection**: `pages/api/offer.ts`
- **Direct Connection**: `pages/api/offer-direct.ts`
- **Frontend Logic**: `pages/dashboard.tsx` (see `initWebRTC` function)

---

## 🚀 Production Recommendations

For production deployments:

1. **Use Ephemeral Token method** exclusively
2. **Remove Direct Method** endpoints from production build
3. **Add rate limiting** on ephemeral token generation
4. **Monitor token usage** for abuse detection
5. **Implement token refresh** if needed for long sessions
6. **Log all token generations** for audit trail

---

**Security First! 🔐 Choose wisely based on your needs.**

---

## 📞 Method 3: Plivo Telephony Integration

### Overview
Connect phone calls to Luna's voice AI using Plivo Media Streams. This enables voice AI for telephony applications.

### Flow Diagram
```
Phone Call              Plivo                  Luna API
  │                       │                        │
  │ 1. Inbound call       │                        │
  │──────────────────────>│                        │
  │                       │                        │
  │                       │ 2. Fetch Answer URL    │
  │                       │   GET your-server/answer
  │                       │──────────────────────>│
  │                       │                        │
  │                       │ 3. Plivo XML           │
  │                       │   <Stream>wss://luna/plivo/stream?api_key=xxx</Stream>
  │                       │<──────────────────────│
  │                       │                        │
  │                       │ 4. WebSocket connect   │
  │                       │──────────────────────>│
  │                       │                        │
  │                       │ 5. Auth via api_key    │
  │                       │<──────────────────────│
  │                       │                        │
  │ 6. Bidirectional      │                        │
  │    audio streaming    │<─────────────────────>│
  │<─────────────────────>│                        │
```

### Implementation

**Step 1: Generate Config Token & Create Answer URL**

Create an endpoint that generates a config token and returns Plivo XML:

```typescript
// pages/api/plivo-answer.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Generate config token with session settings (including system prompt)
  const tokenResponse = await fetch(`${process.env.LUNA_BACKEND_URL}/plivo/configure`, {
    method: 'POST',
    headers: {
      'X-Luna-Key': `Bearer ${process.env.LUNA_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      instructions: 'You are a helpful customer support agent...',
      temperature: 0.7,
      silence_timeout: 60
    })
  });
  
  const { config_token } = await tokenResponse.json();
  
  // Return Plivo XML with config token
  const lunaUrl = `wss://${process.env.LUNA_BACKEND_URL}/plivo/stream?api_key=${process.env.LUNA_API_KEY}&config_token=${config_token}`;
  
  res.setHeader('Content-Type', 'application/xml');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Stream bidirectional="true" streamTimeout="86400" contentType="audio/x-l16;rate=8000">
        ${lunaUrl}
    </Stream>
</Response>`);
}
```

**Step 2: Configure Plivo Application**

In your Plivo dashboard:
1. Create an Application
2. Set Answer URL to `https://your-app.com/api/plivo-answer`
3. Assign your phone number to the application

**Step 3: Make Outbound Calls (Optional)**

```typescript
import Plivo from 'plivo';

const client = new Plivo.Client(PLIVO_AUTH_ID, PLIVO_AUTH_TOKEN);

await client.calls.create({
  from: '+14155551234',
  to: '+14155559876',
  answerUrl: 'https://your-app.com/api/plivo-answer',
  answerMethod: 'GET'
});
```

### Configuration via Config Token (Recommended)

1. **POST `/plivo/configure`** with your config (instructions, temperature, etc.)
2. **Receive `config_token`** (valid 5 min, one-time use)
3. **Include in WebSocket URL**: `?api_key=xxx&config_token=cfg_xxx`

| Token Property | Value |
|----------------|-------|
| Validity | 5 minutes |
| Usage | One-time only |
| Config storage | Embedded in token |

### Configuration via Query Parameters (Simple)

For simple configs without custom prompts:

| Parameter | Description | Default |
|-----------|-------------|---------|
| `api_key` | **Required**. Luna API key | - |
| `config_token` | Token from `/plivo/configure` | - |
| `temperature` | LLM temperature (0.0-2.0) | `0.8` |
| `vad_threshold` | VAD sensitivity (0.0-1.0) | `0.5` |
| `silence_timeout` | End call after N seconds silence | `30` |

### Security Considerations

✅ **Secure Authentication**
- API key passed via query parameter over WSS (TLS encrypted)
- Key validated before WebSocket upgrade
- Supports same API keys as WebRTC methods

⚠️ **Additional Considerations**
- API key visible in server logs (use dedicated telephony keys)
- Consider IP whitelisting for Plivo's servers
- Implement rate limiting on Answer URL

### Best For
- ✅ Phone-based AI agents
- ✅ Customer support automation
- ✅ IVR systems with AI
- ✅ Outbound AI calling campaigns
- ✅ Voice surveys and feedback collection

See [PLIVO_INTEGRATION.md](./PLIVO_INTEGRATION.md) for comprehensive documentation.

---

## 📊 All Methods Comparison

| Feature | Ephemeral Token 🔐 | Direct API 🔓 | Plivo Telephony 📞 |
|---------|-------------------|--------------|-------------------|
| **Use Case** | Browser WebRTC | Browser WebRTC | Phone Calls |
| **Security Level** | Maximum | Good | Good |
| **Token Expiry** | 5 minutes | No expiry | No expiry |
| **Auth Method** | Header | Header | Query param |
| **Bidirectional Audio** | ✅ WebRTC | ✅ WebRTC | ✅ WebSocket |
| **Best For** | Production web | Development | Telephony |

