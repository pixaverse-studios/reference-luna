# Environment Variables Configuration

Create a `.env.local` file in the root of your project with the following variables:

```bash
# Luna Backend Configuration
BACKEND_URL=https://your-luna-backend.com
AUTH_KEY=your_luna_api_key_here
```

## Instructions

1. Copy the content above
2. Create a file named `.env.local` in the root of your project
3. Replace the placeholder values with your actual Luna API credentials
4. Save the file
5. Restart your Next.js development server

## Variable Descriptions

### `BACKEND_URL`
- Your Luna backend server URL
- Example: `https://api.luna.ai` or your custom deployment
- This is where the WebRTC calls endpoint is located
- Used by the `/api/offer` and `/api/ice-servers` proxy routes

### `AUTH_KEY`
- Your Luna API authentication key
- Used in the `X-Luna-Key` header for API requests
- Keep this secure and never commit it to version control

## Security Notes

⚠️ **IMPORTANT**: 
- Never commit `.env.local` to version control
- The `.env.local` file is already in `.gitignore`
- All sensitive credentials are server-side only (no `NEXT_PUBLIC_` prefix)
- API requests are proxied through Next.js API routes to keep credentials secure

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

## OpenAI Compatibility

Luna's API is compatible with OpenAI's Realtime WebRTC API with these key differences:

1. **URL**: Use your Luna backend URL instead of OpenAI's endpoint
2. **Authentication**: Use `X-Luna-Key` header instead of OpenAI's auth mechanism
3. **Everything else**: Same event types, same WebRTC flow, same data channel protocol

This makes migration from OpenAI to Luna seamless!
