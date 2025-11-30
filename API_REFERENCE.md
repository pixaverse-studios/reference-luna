# Luna API Reference

Complete reference for Luna's OpenAI-compatible WebRTC API.

## 🔗 Endpoints

### POST `/v1/realtime/calls`

WebRTC offer/answer exchange endpoint.

**Request Headers:**
```
X-Luna-Key: Bearer YOUR_API_KEY
Content-Type: multipart/form-data
```

**Request Body (multipart/form-data):**
```
sdp: <WebRTC SDP offer string>
session: <JSON session configuration>
```

**Session Configuration:**
```json
{
  "type": "realtime",
  "model": "lunav1",
  "audio": {
    "output": { "voice": "base" }
  },
  "turn_detection": {
    "type": "server_vad",
    "threshold": 0.5,
    "prefix_padding_ms": 300,
    "silence_duration_ms": 500
  },
  "instructions": "Your system prompt here",
  "temperature": 0.8,
  "top_p": 0.95,
  "top_k": 50
}
```

**Response:**
```
<WebRTC SDP answer string>
```

### GET `/api/ice-servers`

Fetches STUN/TURN servers for WebRTC connection.

**Response:**
```json
[
  {
    "urls": "stun:stun.l.google.com:19302"
  },
  {
    "urls": "turn:turn.example.com:3478",
    "username": "user",
    "credential": "pass"
  }
]
```

## 📡 WebRTC Data Channel Events

All events use the data channel named `oai-events` with ordered delivery.

### Session Events

#### `session.created`
Sent when session is successfully initialized.

```json
{
  "type": "session.created",
  "session": {
    "id": "session_abc123",
    "model": "lunav1",
    "instructions": "...",
    "temperature": 0.8,
    "turn_detection": {
      "type": "server_vad",
      "threshold": 0.5,
      "prefix_padding_ms": 300,
      "silence_duration_ms": 500
    }
  }
}
```

#### `session.updated`
Sent when session configuration is updated via `session.update` event.

```json
{
  "type": "session.updated",
  "session": {
    "instructions": "New prompt",
    "temperature": 0.9
    // ... updated fields
  }
}
```

### Input Audio Events

#### `input_audio_buffer.speech_started`
Server detected speech starting.

```json
{
  "type": "input_audio_buffer.speech_started",
  "audio_start_ms": 1234
}
```

#### `input_audio_buffer.speech_stopped`
Server detected speech ending.

```json
{
  "type": "input_audio_buffer.speech_stopped",
  "audio_end_ms": 5678
}
```

#### `input_audio_buffer.committed`
Audio buffer committed to conversation.

```json
{
  "type": "input_audio_buffer.committed",
  "item_id": "item_abc123"
}
```

#### `conversation.item.input_audio_transcription.completed`
User speech transcription complete.

```json
{
  "type": "conversation.item.input_audio_transcription.completed",
  "item_id": "item_abc123",
  "transcript": "What the user said"
}
```

#### `conversation.item.input_audio_transcription.failed`
Transcription failed.

```json
{
  "type": "conversation.item.input_audio_transcription.failed",
  "item_id": "item_abc123",
  "error": {
    "type": "transcription_error",
    "message": "Failed to transcribe audio"
  }
}
```

### Response Events

#### `response.created`
Luna started generating a response.

```json
{
  "type": "response.created",
  "response": {
    "id": "resp_abc123"
  }
}
```

#### `response.output_item.added`
Output item added to response.

```json
{
  "type": "response.output_item.added",
  "item": {
    "id": "item_abc123",
    "type": "message",
    "role": "assistant"
  }
}
```

#### `response.content_part.added`
Content part added to output item.

```json
{
  "type": "response.content_part.added",
  "part": {
    "type": "audio",
    "transcript": ""
  }
}
```

#### `response.audio_transcript.delta`
Streaming transcript chunk (real-time).

```json
{
  "type": "response.audio_transcript.delta",
  "delta": "partial transcript text",
  "item_id": "item_abc123"
}
```

#### `response.audio_transcript.done`
Full transcript complete.

```json
{
  "type": "response.audio_transcript.done",
  "transcript": "Complete response from Luna",
  "item_id": "item_abc123"
}
```

#### `response.output_item.done`
Output item generation complete.

```json
{
  "type": "response.output_item.done",
  "item": {
    "id": "item_abc123",
    "type": "message",
    "role": "assistant",
    "content": [
      {
        "type": "audio",
        "transcript": "Complete response from Luna"
      }
    ]
  }
}
```

#### `response.done`
Response generation fully complete.

```json
{
  "type": "response.done",
  "response": {
    "id": "resp_abc123",
    "status": "completed"
  }
}
```

### Error Events

#### `error`
Something went wrong.

```json
{
  "type": "error",
  "error": {
    "type": "server_error",
    "code": "internal_error",
    "message": "Description of what went wrong"
  }
}
```

## 📤 Client-to-Server Events

### `session.update`
Update session configuration mid-conversation.

**Send:**
```json
{
  "type": "session.update",
  "session": {
    "instructions": "New system prompt",
    "temperature": 0.9,
    "top_p": 0.95,
    "top_k": 50,
    "turn_detection": {
      "type": "server_vad",
      "threshold": 0.6,
      "prefix_padding_ms": 300,
      "silence_duration_ms": 500
    }
  }
}
```

**Receive:**
```json
{
  "type": "session.updated",
  "session": {
    // ... updated configuration
  }
}
```

## ⚙️ Configuration Parameters

### System Prompt (instructions)

Defines Luna's personality and behavior.

**Type:** `string`  
**Default:** `"You are Luna, a helpful AI assistant."`  
**Example:**
```
"You are Luna, a cheerful AI assistant with a British accent. 
Be conversational, witty, and occasionally use humor."
```

### Temperature

Controls randomness in generation.

**Type:** `number`  
**Range:** `0.0 - 2.0`  
**Default:** `0.8`  
**Guidance:**
- `0.0 - 0.3`: Very focused, deterministic
- `0.5 - 0.8`: Balanced (recommended)
- `1.0 - 2.0`: Creative, varied

### Top P (Nucleus Sampling)

Probability mass threshold.

**Type:** `number`  
**Range:** `0.0 - 1.0`  
**Default:** `0.95`  
**Guidance:**
- Lower = more focused on likely tokens
- Higher = considers more diverse tokens
- Recommended: `0.9 - 0.95`

### Top K

Number of top tokens to consider.

**Type:** `integer`  
**Range:** `1 - 100`  
**Default:** `50`  
**Guidance:**
- Lower = more focused
- Higher = more variety
- Recommended: `40 - 60`

### VAD Threshold

Speech detection sensitivity.

**Type:** `number`  
**Range:** `0.0 - 1.0`  
**Default:** `0.5`  
**Guidance:**
- `0.3`: Very sensitive (picks up more sounds)
- `0.5`: Balanced (recommended)
- `0.7`: Less sensitive (only clear speech)

### VAD Prefix Padding

Audio included before speech starts (milliseconds).

**Type:** `integer`  
**Range:** `0 - 1000`  
**Default:** `300`  
**Guidance:**
- Captures audio before VAD trigger
- Higher = more context, potential false starts
- Recommended: `200 - 400 ms`

### VAD Silence Duration

Silence needed to detect turn end (milliseconds).

**Type:** `integer`  
**Range:** `200 - 2000`  
**Default:** `500`  
**Guidance:**
- `200-400 ms`: Fast turn detection
- `500-700 ms`: Balanced (recommended)
- `800-1000 ms`: Slower, allows pauses

## 🔄 Typical Event Flow

### Successful Conversation Turn

```
1. User speaks
   ├─► input_audio_buffer.speech_started
   ├─► input_audio_buffer.speech_stopped
   ├─► input_audio_buffer.committed
   └─► conversation.item.input_audio_transcription.completed

2. Luna responds
   ├─► response.created
   ├─► response.output_item.added
   ├─► response.content_part.added
   ├─► response.audio_transcript.delta (multiple)
   ├─► response.audio_transcript.done
   ├─► response.output_item.done
   └─► response.done
```

### Session Update Flow

```
1. Client sends
   └─► session.update

2. Server confirms
   └─► session.updated

3. New configuration active
   └─► All subsequent responses use new settings
```

## 🔐 Authentication

### Header Format
```
X-Luna-Key: Bearer YOUR_API_KEY
```

### Example (JavaScript)
```javascript
fetch(backendUrl, {
  method: 'POST',
  headers: {
    'X-Luna-Key': `Bearer ${apiKey}`
  },
  body: formData
});
```

## 🎯 Best Practices

### Connection Management
1. Always check ICE connection state
2. Implement reconnection logic for failures
3. Handle network changes gracefully
4. Close connections properly on unmount

### Event Handling
1. Always handle `error` events
2. Don't assume event order (use IDs to match)
3. Handle missing/partial transcripts
4. Implement timeout for long operations

### Configuration
1. Start with default values
2. Adjust based on use case
3. Test VAD settings in your environment
4. Use lower temperature for factual responses

### Performance
1. Use appropriate audio bitrate (32kbps recommended)
2. Enable echo cancellation
3. Monitor data channel buffer
4. Implement client-side VAD for UI feedback

## 📊 Error Codes

| Code | Type | Description | Action |
|------|------|-------------|--------|
| `authentication_error` | Auth | Invalid API key | Check credentials |
| `rate_limit_exceeded` | Rate Limit | Too many requests | Implement backoff |
| `server_error` | Server | Internal error | Retry with backoff |
| `invalid_request` | Validation | Bad request format | Check request structure |
| `connection_failed` | Network | WebRTC failed | Check network/firewall |

## 🧪 Testing

### Test Connection
```javascript
// Check if backend is reachable
const response = await fetch('/api/ice-servers');
console.log(response.ok); // Should be true
```

### Test Events
```javascript
// Log all events for debugging
dataChannel.onmessage = (event) => {
  console.log('Event:', JSON.parse(event.data));
};
```

### Test Audio
```javascript
// Check audio is flowing
pc.ontrack = (event) => {
  const analyser = audioContext.createAnalyser();
  analyser.connect(audioContext.createMediaStreamSource(event.streams[0]));
  // Monitor analyser.getByteFrequencyData() for activity
};
```

## 📞 Plivo Telephony API

### POST `/plivo/configure`

Generate a configuration token with embedded session settings. This is the recommended way to pass system prompts and complex configurations.

**Headers:**
```
X-Luna-Key: Bearer YOUR_API_KEY
Content-Type: application/json
```

**Request Body:**
```json
{
  "instructions": "You are a helpful customer support agent...",
  "temperature": 0.7,
  "top_p": 0.9,
  "top_k": 50,
  "max_tokens": 256,
  "vad_threshold": 0.5,
  "silence_ms": 500,
  "voice_ms": 300,
  "silence_timeout": 60
}
```

**Response:**
```json
{
  "config_token": "cfg_eyJhbGciOiJIUzI1...",
  "expires_at": 1234567890
}
```

**Token Properties:**
- Expires in 5 minutes
- One-time use (invalidated after first WebSocket connection)
- Config embedded in token (secure, no URL exposure)

**Example (JavaScript):**
```javascript
const response = await fetch('https://YOUR_LUNA_BACKEND/plivo/configure', {
  method: 'POST',
  headers: {
    'X-Luna-Key': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    instructions: 'You are a helpful assistant...',
    temperature: 0.7,
    silence_timeout: 60
  })
});

const { config_token, expires_at } = await response.json();
```

---

### WebSocket `/plivo/stream`

Accepts Plivo Media Stream connections for telephony integration.

**Protocol:** WebSocket (wss://)

**Authentication:** Query parameter `api_key`

**URL Format (with config token - recommended):**
```
wss://YOUR_LUNA_BACKEND/plivo/stream?api_key=YOUR_KEY&config_token=cfg_xxx
```

**URL Format (query params only):**
```
wss://YOUR_LUNA_BACKEND/plivo/stream?api_key=YOUR_KEY&temperature=0.7&silence_timeout=60
```

**Query Parameters:**

| Parameter | Type | Required | Description | Default |
|-----------|------|----------|-------------|---------|
| `api_key` | string | ✅ | Your Luna API key | - |
| `config_token` | string | ❌ | Token from `/plivo/configure` | - |
| `temperature` | float | ❌ | LLM temperature (0.0-2.0) | `0.8` |
| `top_p` | float | ❌ | Nucleus sampling (0.0-1.0) | `0.9` |
| `top_k` | int | ❌ | Token selection limit | `50` |
| `max_tokens` | int | ❌ | Max response tokens | `256` |
| `vad_threshold` | float | ❌ | VAD sensitivity (0.0-1.0) | `0.5` |
| `silence_ms` | int | ❌ | Silence to end turn (ms) | `500` |
| `voice_ms` | int | ❌ | Speech to start turn (ms) | `300` |
| `silence_timeout` | int | ❌ | End call after N seconds silence | `30` |

**Audio Format:**
- Input: 8kHz linear PCM 16-bit (from Plivo)
- Output: 16kHz linear PCM 16-bit (to Plivo)

**Example Plivo XML (with config token):**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Stream bidirectional="true" 
            streamTimeout="86400" 
            contentType="audio/x-l16;rate=8000">
        wss://luna.example.com/plivo/stream?api_key=sk-xxx&amp;config_token=cfg_xxx
    </Stream>
</Response>
```

**Example Plivo XML (query params only):**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Stream bidirectional="true" 
            streamTimeout="86400" 
            contentType="audio/x-l16;rate=8000">
        wss://luna.example.com/plivo/stream?api_key=sk-xxx&amp;temperature=0.7&amp;silence_timeout=60
    </Stream>
</Response>
```

See [PLIVO_INTEGRATION.md](./PLIVO_INTEGRATION.md) for more examples and best practices.

---

## 📚 Related Documentation

- [README.md](./README.md) - Project overview
- [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) - Step-by-step integration
- [QUICK_START.md](./QUICK_START.md) - Get running in 2 minutes
- [PLIVO_INTEGRATION.md](./PLIVO_INTEGRATION.md) - Plivo telephony guide
- [CONNECTION_METHODS.md](./CONNECTION_METHODS.md) - All connection methods

---

For questions or issues, contact support@luna.ai

