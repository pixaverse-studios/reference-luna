# Luna API Reference Implementation

A clean, well-documented reference implementation showing how to integrate with Luna's OpenAI-compatible WebRTC API for real-time voice AI conversations.

## 🎯 What is This?

This is a **showcase project** demonstrating best practices for using Luna's voice AI API. It's designed to be:

- **Educational**: Well-commented code showing proper WebRTC integration
- **Complete**: Full implementation with session updates, VAD controls, and event handling
- **Clean**: No unnecessary features - just the core functionality
- **OpenAI-Compatible**: Drop-in replacement for OpenAI's Realtime API

## ✨ Features Demonstrated

### Core Features
- ✅ **WebRTC Connection Setup** - Proper peer connection and audio streaming
- ✅ **Event-Driven Communication** - Full OpenAI-compatible event handling
- ✅ **Real-Time Transcription** - Live conversation display with typewriter effect
- ✅ **Mute Controls** - Independent mic and speaker muting
- ✅ **Live Event Log** - See all WebRTC events in real-time

### Advanced Features
- ✅ **Live Session Updates** - Change prompts and settings mid-conversation
- ✅ **Server-Side VAD Configuration** - Adjust voice activity detection parameters
- ✅ **Generation Parameters** - Control temperature, top_p, and top_k
- ✅ **Conversation Export** - Download transcripts as JSON

### 🔐 Multiple Connection Methods
- ✅ **Ephemeral Token Method** - Secure, production-ready (recommended)
- ✅ **Direct API Method** - Simple, good for development
- ✅ **Plivo Telephony** - Connect phone calls to Luna's AI
- ✅ **Side-by-side comparison** - Switch between methods to understand tradeoffs

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
# or
yarn install
# or
bun install
```

### 2. Configure Environment

Create a `.env.local` file:

```bash
BACKEND_URL=https://fal.run/Pixa-AI/luna-next
AUTH_KEY=your_luna_api_key_here
```

See [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) for detailed configuration.

### 3. Run Development Server

```bash
npm run dev
# or
yarn dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📖 Key Concepts

### Two Connection Methods

This reference implementation showcases **BOTH** ways to connect:

#### 🔐 Ephemeral Token (Secure)
```
Client → /api/ephemeral-key → Luna generates token
Client → /api/offer (with token) → WebRTC established
```
- Token expires in 5 minutes
- One-time use only
- Main API key never exposed

#### 🔓 Direct API (Simple)
```
Client → /api/offer-direct → WebRTC established
```
- Single step
- API key used server-side
- Good for development

See [CONNECTION_METHODS.md](./CONNECTION_METHODS.md) for detailed comparison.

### Luna vs OpenAI

Luna's API is **fully compatible** with OpenAI's Realtime WebRTC API. The only differences are:

| Aspect | OpenAI | Luna |
|--------|--------|------|
| **Endpoint** | `wss://api.openai.com/v1/realtime` | `https://fal.run/Pixa-AI/luna-next` |
| **Auth Header** | `Authorization: Bearer <token>` | `X-Luna-Key: Bearer <key>` |
| **Events** | OpenAI event types | Same event types ✅ |
| **WebRTC Flow** | Standard WebRTC | Same standard ✅ |

### Event Flow

```
1. Client creates WebRTC offer
2. Client sends offer to /api/offer with config
3. Server returns SDP answer
4. WebRTC connection established
5. Data channel opens for events
6. Real-time bi-directional communication begins
```

### Session Updates

You can update the session configuration **while connected**:

```javascript
dataChannel.send(JSON.stringify({
  type: 'session.update',
  session: {
    instructions: 'New prompt...',
    temperature: 0.9,
    turn_detection: {
      type: 'server_vad',
      threshold: 0.6,
      prefix_padding_ms: 300,
      silence_duration_ms: 500
    }
  }
}));
```

## 🏗️ Project Structure

```
luna-example/
├── pages/
│   ├── index.tsx              # Redirects to dashboard
│   ├── dashboard.tsx          # Main WebRTC UI (heavily commented)
│   ├── plivo.tsx              # 📞 Plivo telephony test page
│   └── api/
│       ├── ephemeral-key.ts   # 🔐 Generate ephemeral tokens (secure)
│       ├── offer.ts           # 🔐 WebRTC with ephemeral token
│       ├── offer-direct.ts    # 🔓 WebRTC with direct API key
│       ├── ice-servers.ts     # ICE servers endpoint
│       └── plivo/
│           ├── configure.ts   # 📞 Generate Plivo config token
│           ├── answer.ts      # 📞 Plivo XML answer endpoint
│           └── call.ts        # 📞 Initiate outbound calls
├── components/
│   └── TranscriptPanel.tsx    # Conversation display
├── lib/
│   ├── config.ts              # Configuration constants
│   └── utils.ts               # Utility functions
├── CONNECTION_METHODS.md      # WebRTC connection methods comparison
├── PLIVO_INTEGRATION.md       # 📞 Plivo telephony integration guide
└── .env.local                 # Your API credentials (not in git)
```

## 🎛️ Configuration Options

### System Prompt
Define Luna's personality, behavior, and speaking style.

### Generation Parameters
- **Temperature** (0-2): Controls randomness. Lower = focused, Higher = creative
- **Top P** (0-1): Nucleus sampling threshold
- **Top K** (1-100): Number of top tokens to consider

### Server-Side VAD Settings
- **Threshold** (0-1): Speech detection sensitivity
- **Prefix Padding** (ms): Audio included before speech starts
- **Silence Duration** (ms): Silence needed to detect turn end

## 🔧 API Routes Explained

### `/api/offer`
Proxies WebRTC offers to Luna backend. Handles:
- SDP offer/answer exchange
- Session configuration
- Authentication with Luna API

### `/api/ice-servers`
Fetches ICE servers for WebRTC connection establishment.

### `/api/plivo/configure`
Generates a config token for Plivo sessions with embedded settings.

### `/api/plivo/answer`
Returns Plivo XML to connect calls to Luna's AI.

### `/api/plivo/call`
Initiates outbound calls via Plivo API.

## 📞 Plivo Telephony Integration

Connect phone calls to Luna's voice AI! Visit `/plivo` to test.

### Quick Start

1. **Add Plivo credentials** to `.env.local`:
```bash
PLIVO_AUTH_ID=your_auth_id
PLIVO_AUTH_TOKEN=your_auth_token
```

2. **Expose your server** (for testing):
```bash
ngrok http 3000
```

3. **Configure Plivo Application**:
   - Set Answer URL to: `https://your-ngrok-url/api/plivo/answer`

4. **Test**: Call your Plivo number or use the Make Call feature

See [PLIVO_INTEGRATION.md](./PLIVO_INTEGRATION.md) for detailed documentation.

## 📝 Code Walkthrough

### Key Functions in `dashboard.tsx`

#### `initWebRTC()`
Sets up WebRTC connection with proper:
- ICE server configuration
- Data channel setup
- Audio track handling
- Event listeners

#### `handleDataChannelMessage()`
Processes OpenAI-compatible events:
- `session.created` / `session.updated`
- `input_audio_buffer.speech_started/stopped`
- `conversation.item.input_audio_transcription.completed`
- `response.audio_transcript.done`
- `error` events

#### `updateSession()`
Sends `session.update` event to change configuration mid-conversation.

## 🎨 UI Components

### TranscriptPanel
Displays conversation with:
- User and assistant messages
- Timestamps
- Typewriter effect
- Export functionality

### Configuration Panel
Controls for:
- System prompt
- Generation parameters
- VAD settings
- Connection management

## 🐛 Debugging

Enable verbose logging by checking the browser console. Events are logged with emojis:
- 📨 Incoming events
- 📤 Outgoing events
- ✅ Success states
- ❌ Errors
- 🔌 Connection states

## 📚 Additional Resources

- [API Reference](./API_REFERENCE.md) - Full API documentation
- [Integration Guide](./INTEGRATION_GUIDE.md) - Step-by-step integration
- [Connection Methods](./CONNECTION_METHODS.md) - WebRTC connection options
- [Plivo Integration](./PLIVO_INTEGRATION.md) - Telephony integration guide
- [OpenAI Realtime API Docs](https://platform.openai.com/docs/guides/realtime) - Compatible API specification
- [WebRTC Basics](https://webrtc.org/getting-started/overview) - Learn WebRTC fundamentals

## 🤝 Contributing

This is a reference implementation. Feel free to:
- Use it as a starting point for your project
- Submit issues for bugs or unclear documentation
- Suggest improvements to code comments

## 📄 License

This project is provided as-is for educational and reference purposes.

## 💬 Support

- **Discord**: [Join our community](#)
- **Documentation**: [docs.luna.ai](#)
- **Email**: support@luna.ai

---

Built with ❤️ by the Luna team
