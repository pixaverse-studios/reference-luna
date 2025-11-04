import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * WebRTC Offer/Answer Exchange Endpoint
 * 
 * This API route proxies WebRTC offers to the Luna backend and returns the SDP answer.
 * 
 * Flow:
 * 1. Client creates WebRTC offer with local media tracks
 * 2. Client sends offer SDP + session config to this endpoint
 * 3. This endpoint forwards to Luna backend with authentication
 * 4. Luna backend processes offer and returns SDP answer
 * 5. Client sets remote description with the answer
 * 6. WebRTC connection is established
 * 
 * Why proxy through Next.js?
 * - Keeps AUTH_KEY secure (server-side only)
 * - Avoids CORS issues
 * - Allows request/response transformation if needed
 */

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb', // SDP offers can be large
    },
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const BACKEND_URL = process.env.BACKEND_URL;

  if (!BACKEND_URL) {
    return res.status(500).json({ error: 'Missing BACKEND_URL configuration' });
  }

  try {
    const { sdp, ephemeral_token } = req.body;

    if (!sdp) {
      return res.status(400).json({ error: 'Missing SDP in request' });
    }

    if (!ephemeral_token) {
      return res.status(400).json({ error: 'Missing ephemeral_token. Call /api/ephemeral-key first.' });
    }

    // Luna's realtime calls endpoint
    const backendUrl = BACKEND_URL.replace(/\/$/, '');
    const targetUrl = `${backendUrl}/v1/realtime/calls`;

    // Send SDP offer with ephemeral token
    // Note: Luna accepts raw SDP body (not FormData when using ephemeral tokens)
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/sdp',
        'X-Luna-Key': `Bearer ${ephemeral_token}`,  // Use ephemeral token from client
      },
      body: sdp,  // Raw SDP string
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).send(errorText);
    }

    const answer = await response.text();

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Return the answer as plain text (SDP)
    res.status(200).send(answer);
  } catch (error: any) {
    res.status(502).json({ error: 'Failed to connect to backend', details: error.message });
  }
}
