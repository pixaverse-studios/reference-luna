# Luna Plivo Telephony Integration

Connect phone calls to Luna's voice AI using Plivo Media Streams.

## 🎯 Overview

Luna supports telephony integration through Plivo, allowing you to:
- Connect inbound phone calls to Luna's AI
- Make outbound calls with AI voice agents
- Configure AI behavior using configuration tokens or query parameters

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Phone     │────▶│   Plivo     │────▶│   Luna      │
│  (Caller)   │◀────│  (Bridge)   │◀────│  Backend    │
└─────────────┘     └─────────────┘     └─────────────┘
```

## 🧪 Reference Implementation

This project includes a complete Plivo integration you can test:

1. **Test Page**: Visit `/plivo` to configure and test calls
2. **API Endpoints**:
   - `/api/plivo/configure` - Generate config tokens
   - `/api/plivo/answer` - Plivo XML answer endpoint
   - `/api/plivo/call` - Initiate outbound calls

### Quick Test

```bash
# 1. Add to .env.local
PLIVO_AUTH_ID=your_auth_id
PLIVO_AUTH_TOKEN=your_auth_token

# 2. Start dev server
npm run dev

# 3. Expose with ngrok
ngrok http 3000

# 4. Visit http://localhost:3000/plivo
```

## 📋 Prerequisites

- Luna backend URL and API key
- Plivo account with:
  - Auth ID and Auth Token
  - Phone number(s)
  - Application configured

## 🚀 Quick Start

### Step 1: Generate a Config Token

First, call the Luna API to create a configuration token with your session settings:

```javascript
const response = await fetch('https://YOUR_LUNA_BACKEND/plivo/configure', {
  method: 'POST',
  headers: {
    'X-Luna-Key': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    instructions: `You are a helpful customer support agent.
    
Guidelines:
- Be professional and empathetic
- Keep responses brief for phone conversations
- If you can't help, offer to transfer to a human`,
    temperature: 0.7,
    silence_timeout: 60
  })
});

const { config_token, expires_at } = await response.json();
// config_token: "cfg_eyJhbGciOiJIUzI1..."
// expires_at: Unix timestamp (5 minutes from now)
```

### Step 2: Create an Answer URL Endpoint

Create an endpoint that returns Plivo XML with the config token:

```typescript
// pages/api/plivo-answer.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Generate a fresh config token for this call
  const tokenResponse = await fetch(`${process.env.LUNA_BACKEND_URL}/plivo/configure`, {
    method: 'POST',
    headers: {
      'X-Luna-Key': `Bearer ${process.env.LUNA_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      instructions: 'You are a helpful support agent...',
      temperature: 0.7,
      silence_timeout: 60
    })
  });
  
  const { config_token } = await tokenResponse.json();
  
  // Return Plivo XML with the config token
  res.setHeader('Content-Type', 'application/xml');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Stream bidirectional="true" streamTimeout="86400" contentType="audio/x-l16;rate=8000">
        wss://${process.env.LUNA_BACKEND_URL}/plivo/stream?api_key=${process.env.LUNA_API_KEY}&amp;config_token=${config_token}
    </Stream>
</Response>`);
}
```

### Step 3: Configure Plivo Application

In your Plivo dashboard:
1. Create an Application
2. Set Answer URL to your XML endpoint (e.g., `https://your-app.com/api/plivo-answer`)
3. Assign your phone number to the application

### Step 4: Test It!

Call your Plivo number and talk to Luna.

## ⚙️ Configuration Methods

### Method 1: Config Token (Recommended)

Best for complex configurations like system prompts.

**Flow:**
```
Your Server                              Luna Server
    │                                         │
    │  POST /plivo/configure                  │
    │  { instructions, temperature, ... }     │
    │────────────────────────────────────────>│
    │                                         │
    │  { config_token, expires_at }           │
    │<────────────────────────────────────────│
    │                                         │
    │  (Include token in Plivo XML)           │
    │                                         │
```

**Benefits:**
- No URL length limits
- System prompt not exposed in URLs
- One-time use (secure)
- 5-minute validity window

### Method 2: Query Parameters

For simple configurations without custom prompts:

```xml
<Stream bidirectional="true" streamTimeout="86400" contentType="audio/x-l16;rate=8000">
    wss://luna/plivo/stream?api_key=xxx&amp;temperature=0.7&amp;silence_timeout=60
</Stream>
```

### Method 3: Hybrid

Use a config token for the prompt, but override other settings via query params:

```xml
<Stream bidirectional="true" streamTimeout="86400" contentType="audio/x-l16;rate=8000">
    wss://luna/plivo/stream?api_key=xxx&amp;config_token=cfg_xxx&amp;temperature=0.9
</Stream>
```

Query parameters override token values (except instructions).

## 📋 Configuration Options

### POST `/plivo/configure` Request Body

| Field | Type | Description | Default |
|-------|------|-------------|---------|
| `instructions` | string | System prompt | Server default |
| `temperature` | float | LLM creativity (0.0-2.0) | `0.8` |
| `top_p` | float | Nucleus sampling (0.0-1.0) | `0.9` |
| `top_k` | int | Token selection limit | `50` |
| `max_tokens` | int | Max response tokens | `256` |
| `vad_threshold` | float | Speech detection (0.0-1.0) | `0.5` |
| `silence_ms` | int | Silence to end turn (ms) | `500` |
| `voice_ms` | int | Speech to start turn (ms) | `300` |
| `silence_timeout` | int | End call after N seconds silence | `30` |

### Query Parameters (for `/plivo/stream`)

Same fields as above, plus:
- `api_key` (required) - Your Luna API key
- `config_token` - Token from `/plivo/configure`

## 📞 Making Outbound Calls

Use Plivo's API to initiate calls with dynamic configuration:

```javascript
import Plivo from 'plivo';

async function makeAICall(toNumber, instructions) {
  // 1. Generate config token for this specific call
  const tokenResponse = await fetch(`${LUNA_URL}/plivo/configure`, {
    method: 'POST',
    headers: {
      'X-Luna-Key': `Bearer ${LUNA_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      instructions,
      temperature: 0.7,
      silence_timeout: 60
    })
  });
  
  const { config_token } = await tokenResponse.json();
  
  // 2. Make the call with config token in answer URL
  const client = new Plivo.Client(PLIVO_AUTH_ID, PLIVO_AUTH_TOKEN);
  
  const response = await client.calls.create({
    from: '+14155551234',
    to: toNumber,
    // Pass config token to your answer URL
    answerUrl: `https://your-app.com/api/plivo-answer?config_token=${config_token}`,
    answerMethod: 'GET'
  });
  
  console.log('Call UUID:', response.requestUuid);
}

// Usage
await makeAICall('+14155559876', 'You are a sales agent calling about...');
```

## 🔄 Event Flow

### Call Lifecycle

1. **Config Token Generated** → Your server creates token with session config
2. **Call Initiated** → Plivo connects to callee
3. **Call Answered** → Plivo fetches your Answer URL
4. **Stream Started** → Plivo connects to Luna WebSocket with config_token
5. **Token Validated** → Luna extracts config, marks token as used
6. **Conversation** → Bidirectional audio streaming
7. **Call Ended** → Hangup or silence timeout

### Token Lifecycle

```
Generate token → Valid for 5 min → Used on WebSocket connect → Invalidated
                      │
                      └── If not used within 5 min → Expired
```

## 🎯 Best Practices

### System Prompts for Phone

```javascript
const phonePrompt = `You are a voice assistant for phone calls.

Guidelines:
- Keep responses SHORT (1-2 sentences when possible)
- Speak naturally, as if on a phone call
- Don't use markdown, bullet points, or formatting
- Confirm understanding before long explanations
- If caller is unclear, ask for clarification
- End calls politely when complete`;
```

### VAD Tuning

```javascript
// Quiet environment
{ vad_threshold: 0.6, silence_ms: 400, voice_ms: 200 }

// Noisy environment  
{ vad_threshold: 0.4, silence_ms: 600, voice_ms: 350 }
```

### Silence Timeout

```javascript
// Quick interactions (IVR)
{ silence_timeout: 15 }

// Support calls
{ silence_timeout: 60 }

// Long conversations
{ silence_timeout: 120 }
```

## 🔐 Security

### Config Token Security

- Tokens are **one-time use** - invalidated after first connection
- Tokens expire after **5 minutes**
- Config is **embedded** in token (no database lookup)
- Tokens are **signed** (can't be tampered with)

### API Key Protection

- Never expose API keys in client-side code
- Use your backend to generate config tokens
- Rotate keys periodically

## 🐛 Troubleshooting

### "Invalid or expired config_token"

- Token expires after 5 minutes - generate fresh tokens
- Token can only be used once - generate new token per call
- Check token wasn't truncated in URL

### "Unauthorized" from Luna

- Verify `api_key` parameter is correct
- Check `X-Luna-Key` header format for `/plivo/configure`

### Calls Disconnect Immediately

- Check your Answer URL returns valid XML
- Verify `silence_timeout` isn't too short
- Check Luna server logs

## 📚 Related Documentation

- [API Reference](./API_REFERENCE.md) - Full API documentation
- [Integration Guide](./INTEGRATION_GUIDE.md) - WebRTC integration
- [Connection Methods](./CONNECTION_METHODS.md) - All connection options

## 💬 Support

Need help?
- **Discord**: [Join community](https://discord.gg/luna)
- **Email**: support@luna.ai
- **Docs**: [docs.luna.ai](https://docs.luna.ai)
