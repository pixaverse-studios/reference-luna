# Quick Start Guide

Get Luna's reference implementation running in 2 minutes!

## 1️⃣ Clone & Install

```bash
# Install dependencies
npm install
# or
bun install
```

## 2️⃣ Configure

Create `.env.local` in the project root:

```bash
BACKEND_URL=https://fal.run/Pixa-AI/luna-next
AUTH_KEY=your_api_key_here
```

## 3️⃣ Run

```bash
npm run dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000)

## 🎉 That's It!

You should see the Luna playground. Click "Connect to Luna" to start!

## 📖 Next Steps

- **Read the [README.md](./README.md)** for full feature overview
- **Check [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)** for detailed integration instructions
- **Explore [dashboard.tsx](./pages/dashboard.tsx)** for heavily commented WebRTC code
- **Review [API routes](./pages/api/)** to understand backend proxying

## 🐛 Troubleshooting

### Can't connect?
1. Check your `BACKEND_URL` is correct
2. Verify your `AUTH_KEY` is valid
3. Ensure you've allowed microphone access

### No audio?
1. Check browser console for errors
2. Try different browser (Chrome/Edge recommended)
3. Check system audio settings

## 💬 Need Help?

- Discord: [Join our community](#)
- Email: support@luna.ai
- Docs: [docs.luna.ai](#)

