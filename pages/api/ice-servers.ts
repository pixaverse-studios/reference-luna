import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * ICE Servers Endpoint
 * 
 * Fetches STUN/TURN servers from Luna backend for WebRTC connection establishment.
 * 
 * What are ICE servers?
 * - STUN servers help discover your public IP address
 * - TURN servers relay traffic when direct connection isn't possible
 * - Required for WebRTC to work across different network configurations
 * 
 * This endpoint proxies the request to keep backend URL server-side only.
 */

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Luna backend configuration
  const backendUrl = process.env.BACKEND_URL?.replace(/\/$/, '');
  const targetUrl = `${backendUrl}/api/ice-servers`;

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText });
    }

    const iceServers = await response.json();

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    res.status(200).json(iceServers);
  } catch (error: any) {
    res.status(502).json({ error: 'Failed to connect to backend', details: error.message });
  }
}

