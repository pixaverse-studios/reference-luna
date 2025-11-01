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

### Advanced Features
- ✅ **Live Session Updates** - Change prompts and settings mid-conversation
- ✅ **Server-Side VAD Configuration** - Adjust voice activity detection parameters
- ✅ **Generation Parameters** - Control temperature, top_p, and top_k
- ✅ **Conversation Export** - Download transcripts as JSON

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
BACKEND_URL=https://your-luna-backend.com
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

### Luna vs OpenAI

Luna's API is **fully compatible** with OpenAI's Realtime WebRTC API. The only differences are:

| Aspect | OpenAI | Luna |
|--------|--------|------|
| **Endpoint** | `wss://api.openai.com/v1/realtime` | Your Luna backend URL |
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
│   └── api/
│       ├── offer.ts           # WebRTC offer/answer proxy
│       └── ice-servers.ts     # ICE servers endpoint
├── components/
│   └── TranscriptPanel.tsx    # Conversation display
├── lib/
│   ├── config.ts              # Configuration constants
│   └── utils.ts               # Utility functions
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

- [Luna API Documentation](#) - Detailed API reference
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
