import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Plivo Configuration Token Endpoint
 * 
 * This API route proxies to Luna's /plivo/configure endpoint to generate
 * configuration tokens with embedded session settings.
 * 
 * Flow:
 * 1. Client sends session config (instructions, temperature, etc.)
 * 2. This endpoint forwards to Luna backend with authentication
 * 3. Luna validates instructions through prompt layer
 * 4. Luna returns config_token (valid 5 min, one-time use)
 * 5. Client uses token in Plivo XML stream URL
 * 
 * Why use config tokens?
 * - System prompts can be complex (no URL length limits)
 * - Prompt not exposed in URLs (security)
 * - Same prompt layer validation as WebRTC sessions
 */

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const BACKEND_URL = process.env.BACKEND_URL;
  const AUTH_KEY = process.env.AUTH_KEY;

  if (!BACKEND_URL) {
    return res.status(500).json({ error: 'Missing BACKEND_URL configuration' });
  }

  if (!AUTH_KEY) {
    return res.status(500).json({ error: 'Missing AUTH_KEY configuration' });
  }

  try {
    const { instructions, temperature, top_p, top_k, max_tokens, vad_threshold, silence_ms, voice_ms, silence_timeout } = req.body;

    // Build request body for Luna's /plivo/configure
    const configBody: Record<string, any> = {};
    
    if (instructions) configBody.instructions = instructions;
    if (temperature !== undefined) configBody.temperature = temperature;
    if (top_p !== undefined) configBody.top_p = top_p;
    if (top_k !== undefined) configBody.top_k = top_k;
    if (max_tokens !== undefined) configBody.max_tokens = max_tokens;
    if (vad_threshold !== undefined) configBody.vad_threshold = vad_threshold;
    if (silence_ms !== undefined) configBody.silence_ms = silence_ms;
    if (voice_ms !== undefined) configBody.voice_ms = voice_ms;
    if (silence_timeout !== undefined) configBody.silence_timeout = silence_timeout;

    // Luna's Plivo configure endpoint
    const backendUrl = BACKEND_URL.replace(/\/$/, '');
    const targetUrl = `${backendUrl}/plivo/configure`;

    console.log(`[Plivo Configure] Requesting config token from ${targetUrl}`);

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Luna-Key': `Bearer ${AUTH_KEY}`,
      },
      body: JSON.stringify(configBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Plivo Configure] Error from Luna: ${response.status} - ${errorText}`);
      return res.status(response.status).json({ 
        error: 'Failed to generate config token', 
        details: errorText 
      });
    }

    const data = await response.json();
    console.log(`[Plivo Configure] Token generated, expires at ${data.expires_at}`);

    // Return the config token
    res.status(200).json(data);
  } catch (error: any) {
    console.error('[Plivo Configure] Error:', error);
    res.status(502).json({ error: 'Failed to connect to backend', details: error.message });
  }
}

