# 📞 Luna + Plivo: From Zero to First Call

This guide is designed for **absolute beginners** to Luna and Plivo. We will walk you through setting up your first AI phone agent from scratch.

## 🏁 Prerequisites

Before we start, you need:
1.  **A Plivo Account**: [Sign up here](https://console.plivo.com/accounts/register/) (Free trial available).
2.  **A Luna API Key**: You should have received this from the Luna team.
3.  **Node.js Installed**: [Download here](https://nodejs.org/).
4.  **Ngrok Installed**: [Download here](https://ngrok.com/download) (Required for local testing).

---

##  step 1: Get a Phone Number

1.  Log in to your [Plivo Console](https://console.plivo.com/dashboard/).
2.  Go to **Phone Numbers** > **Buy Numbers**.
3.  Search for a number (e.g., US) and click **Buy**.
    *   *Note: Trial accounts may give you a free sandbox number.*

## Step 2: Setup Your Local Server

We will use the `reference-luna` project as our base.

1.  **Clone/Download the project** (if you haven't already).
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Configure Environment**:
    Create a file named `.env.local` in the root folder and paste this:
    ```ini
    # Luna Configuration
    BACKEND_URL=https://fal.run/Pixa-AI/luna-next
    AUTH_KEY=your_luna_api_key_here

    # Plivo Configuration (Found in Plivo Console top right)
    PLIVO_AUTH_ID=your_plivo_auth_id
    PLIVO_AUTH_TOKEN=your_plivo_auth_token
    ```

4.  **Start the server**:
    ```bash
    npm run dev
    ```
    Your server is now running at `http://localhost:3000`.

## Step 3: Expose Your Server to the Internet

Plivo needs to reach your local server to ask "What do I do with this call?". We use **ngrok** for this.

1.  Open a new terminal window.
2.  Run:
    ```bash
    ngrok http 3000
    ```
3.  Copy the **Forwarding URL** that looks like `https://your-id.ngrok-free.app`.

## Step 4: Connect Plivo to Your Code

1.  Go to [Plivo Console](https://console.plivo.com/) > **Voice** > **Applications**.
2.  Click **Add New Application**.
3.  **App Name**: `Luna AI Agent`
4.  **Answer URL**: Paste your ngrok URL and add `/api/plivo/answer`.
    *   Example: `https://your-id.ngrok-free.app/api/plivo/answer`
    *   Method: `GET` (or POST, both work)
5.  Click **Create Application**.
6.  **Link Number**: Go to **Phone Numbers**, select your number, and under "Application Type" choose "XML Application". Select the "Luna AI Agent" app you just created.

## Step 5: Test It! 📞

1.  Pick up your phone.
2.  Call the Plivo number you bought.
3.  **You should hear Luna!**
    *   *Note: It might take a few seconds to connect initially.*

---

## 🧠 How It Works (In Plain English)

1.  **You Call** -> Plivo receives the call.
2.  **Plivo Asks** -> Plivo sends a request to your `Answer URL` (`/api/plivo/answer`).
3.  **Your Server Replies** -> Your code generates an **XML instruction** saying: "Connect this audio stream to Luna's WebSocket server."
    *   *This is where `api/plivo/answer.ts` comes in.*
4.  **Luna Takes Over** -> Luna's AI listens to the audio, thinks, and speaks back in real-time.

## 🔧 Customizing the AI

Want to change how the AI behaves? Open `pages/api/plivo/answer.ts` (or the config endpoint being used) and look for `instructions`.

```javascript
// Example in pages/api/plivo/answer.ts
instructions: `You are a helpful pizza ordering assistant.
              Ask the user for their toppings and size.`,
```

Save the file, and call again. The AI personality will change instantly!

## 🐞 Troubleshooting

*   **"I hear nothing/call ends immediately"**:
    *   Check your ngrok terminal. Do you see requests like `GET /api/plivo/answer 200 OK`?
    *   If you see `500 Error`, check your server terminal for error messages (likely missing API keys).
    *   If you see `404 Not Found`, check your Answer URL in Plivo.

*   **"SSL/Certificate Error"**:
    *   This happens with free ngrok domains sometimes. See the previous fix in `call.ts` or use a production domain.

---

## 📚 Next Steps

*   **Make Outbound Calls**: Look at `/api/plivo/call` to have the AI call you!
*   **Production**: Deploy your code to Vercel/AWS so you don't need ngrok running on your laptop.

