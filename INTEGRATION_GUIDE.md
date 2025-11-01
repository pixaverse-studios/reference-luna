# Luna API Integration Guide

This guide walks you through integrating Luna's WebRTC API into your application, using this reference implementation as a starting point.

## 🎯 Overview

Luna's API is **100% compatible** with OpenAI's Realtime WebRTC API. If you're familiar with OpenAI's implementation, you only need to change:

1. **URL**: Point to your Luna backend
2. **Authentication**: Use `X-Luna-Key` header

Everything else (events, WebRTC flow, data channel protocol) is identical.

## 📋 Prerequisites

- Node.js 18+ or Bun
- Luna API credentials (backend URL + API key)
- Basic understanding of WebRTC and async JavaScript

## 🚀 Step-by-Step Integration

### 1. Setup Environment

Create `.env.local`:

```bash
BACKEND_URL=https://your-luna-backend.com
AUTH_KEY=your_api_key_here
```

### 2. Install Dependencies

```bash
npm install
# or
bun install
```

### 3. Understand the Architecture

```
┌─────────────────┐
│   Browser       │
│  (dashboard.tsx)│
└────────┬────────┘
         │ WebRTC Setup
         ▼
┌─────────────────┐
│  /api/offer     │ ◄── Proxies to Luna backend
│  /api/ice-servers│     with authentication
└────────┬────────┘
         │ HTTPS
         ▼
┌─────────────────┐
│  Luna Backend   │
│  (Your server)  │
└─────────────────┘
```

### 4. Key Code Sections

#### A. WebRTC Connection Setup

```typescript
// See: pages/dashboard.tsx -> initWebRTC()
const pc = new RTCPeerConnection({ iceServers });

// Create data channel for OpenAI-compatible events
const dataChannel = pc.createDataChannel('oai-events', { ordered: true });

// Add user's microphone
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
pc.addTrack(stream.getAudioTracks()[0], stream);

// Create offer and send to Luna
const offer = await pc.createOffer();
await pc.setLocalDescription(offer);
```

#### B. Sending Session Configuration

```typescript
// See: pages/api/offer.ts
const sessionConfig = {
  type: 'realtime',
  model: 'lunav1',
  instructions: 'Your system prompt here',
  temperature: 0.8,
  turn_detection: {
    type: 'server_vad',
    threshold: 0.5,
    prefix_padding_ms: 300,
    silence_duration_ms: 500
  }
};

// Send to Luna backend
const response = await fetch(backendUrl, {
  method: 'POST',
  headers: {
    'X-Luna-Key': `Bearer ${apiKey}`
  },
  body: formData // Contains SDP + session config
});
```

#### C. Handling Events

```typescript
// See: pages/dashboard.tsx -> handleDataChannelMessage()
dataChannel.onmessage = (event) => {
  const eventData = JSON.parse(event.data);
  
  switch (eventData.type) {
    case 'session.created':
      // Session initialized
      break;
    
    case 'input_audio_buffer.speech_started':
      // User started speaking
      break;
    
    case 'response.audio_transcript.done':
      // Got full transcript from Luna
      const transcript = eventData.transcript;
      break;
    
    // ... handle other events
  }
};
```

#### D. Updating Session Mid-Conversation

```typescript
// See: pages/dashboard.tsx -> updateSession()
const updateEvent = {
  type: 'session.update',
  session: {
    instructions: 'New prompt',
    temperature: 0.9,
    turn_detection: {
      type: 'server_vad',
      threshold: 0.6,
      prefix_padding_ms: 300,
      silence_duration_ms: 500
    }
  }
};

dataChannel.send(JSON.stringify(updateEvent));
```

## 🔄 Complete Event Flow

```
1. USER SPEAKS
   └─► input_audio_buffer.speech_started
   └─► input_audio_buffer.speech_stopped
   └─► input_audio_buffer.committed
   └─► conversation.item.input_audio_transcription.completed
       (contains user transcript)

2. LUNA RESPONDS
   └─► response.created
   └─► response.output_item.added
   └─► response.audio_transcript.done
       (contains Luna's transcript)
   └─► response.done

3. ERROR HANDLING
   └─► error event (if something goes wrong)
```

## 📝 OpenAI Event Types (All Supported)

### Session Events
- `session.created` - Session initialized
- `session.updated` - Configuration changed

### Input Audio Events
- `input_audio_buffer.speech_started` - User started speaking
- `input_audio_buffer.speech_stopped` - User stopped speaking
- `input_audio_buffer.committed` - Audio committed to conversation
- `conversation.item.input_audio_transcription.completed` - User transcript ready

### Response Events
- `response.created` - Luna started generating response
- `response.output_item.added` - Output item added
- `response.audio_transcript.delta` - Streaming transcript chunk
- `response.audio_transcript.done` - Full transcript complete
- `response.done` - Response generation complete

### Error Events
- `error` - Something went wrong

## 🎛️ Configuration Options

### System Prompt (Instructions)
Define Luna's personality and behavior:
```typescript
instructions: "You are Luna, a helpful assistant who speaks clearly and concisely."
```

### Generation Parameters
```typescript
temperature: 0.8,  // 0-2, controls randomness
top_p: 0.95,       // 0-1, nucleus sampling
top_k: 50          // 1-100, token selection
```

### Voice Activity Detection (VAD)
```typescript
turn_detection: {
  type: 'server_vad',           // Always use server_vad
  threshold: 0.5,                // 0-1, speech detection sensitivity
  prefix_padding_ms: 300,        // Include audio before speech
  silence_duration_ms: 500       // Silence to detect turn end
}
```

## 🔐 Security Best Practices

### ✅ DO
- Keep `AUTH_KEY` server-side only (no `NEXT_PUBLIC_` prefix)
- Use Next.js API routes to proxy Luna backend calls
- Validate and sanitize user input
- Set rate limits on your API routes
- Use HTTPS in production

### ❌ DON'T
- Expose API keys in client-side code
- Make direct calls from browser to Luna backend
- Store credentials in git
- Use same API key for dev/staging/production

## 🐛 Common Issues & Solutions

### Issue: "Failed to fetch ICE servers"
**Solution**: Check `BACKEND_URL` in `.env.local` is correct and accessible.

### Issue: "Data channel not opening"
**Solution**: Ensure WebRTC offer/answer exchange completed. Check browser console for WebRTC errors.

### Issue: "No audio received"
**Solution**: 
1. Check microphone permissions granted
2. Verify `pc.ontrack` handler is set up
3. Check audio element is created and not muted

### Issue: "Events not being received"
**Solution**:
1. Verify data channel state is 'open'
2. Check `dataChannel.onmessage` handler is attached
3. Look for JSON parsing errors in console

## 📚 Additional Resources

### Code References
- **Main WebRTC Logic**: `pages/dashboard.tsx`
- **Backend Proxy**: `pages/api/offer.ts`
- **Event Handling**: `pages/dashboard.tsx` -> `handleDataChannelMessage()`

### External Documentation
- [WebRTC API Docs](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [OpenAI Realtime API](https://platform.openai.com/docs/guides/realtime) (Compatible spec)
- [RTCPeerConnection Guide](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection)

## 🎨 Customization Ideas

### Add Custom UI
- Replace transcript panel with your own design
- Add visualization for audio levels
- Create custom controls

### Extend Functionality
- Add conversation history (localStorage or database)
- Implement conversation analytics
- Add multi-user support
- Create conversation templates

### Production Enhancements
- Add error retry logic
- Implement reconnection handling
- Add bandwidth adaptation
- Monitor connection quality

## 🚢 Deployment

### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

Add environment variables in Vercel dashboard:
- `BACKEND_URL`
- `AUTH_KEY`

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Other Platforms
- **Netlify**: Works with adapter
- **AWS**: Use Amplify or ECS
- **Self-hosted**: Build and run with `npm run build && npm start`

## 💬 Support

Need help? Contact us:
- **Discord**: [Join community](https://discord.gg/luna)
- **Email**: support@luna.ai
- **Docs**: [docs.luna.ai](https://docs.luna.ai)

## 📄 License

This reference implementation is provided as-is for educational purposes.

---

Happy coding! 🚀

