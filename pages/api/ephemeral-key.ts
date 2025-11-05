import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Ephemeral Key Generation Endpoint
 * 
 * Creates a short-lived token (5 minutes TTL) for WebRTC connection.
 * This is the SECURE way to use Luna API - keeps your main API key server-side only.
 * 
 * Flow:
 * 1. Client requests ephemeral key from this endpoint
 * 2. Server generates ephemeral token from Luna using main API key
 * 3. Client uses ephemeral token for WebRTC connection
 * 4. Token expires after 5 minutes and is one-time use
 * 
 * Benefits:
 * - Main API key never exposed to client
 * - Token auto-expires (5 min TTL)
 * - One-time use (revoked after first WebRTC call)
 * - Session config controlled server-side
 */

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const AUTH_KEY = process.env.AUTH_KEY;
  const BACKEND_URL = process.env.BACKEND_URL;

  if (!AUTH_KEY) {
    return res.status(500).json({ error: 'Missing AUTH_KEY configuration' });
  }

  if (!BACKEND_URL) {
    return res.status(500).json({ error: 'Missing BACKEND_URL configuration' });
  }

  try {
    const {
      custom_prompt,
      temperature,
      top_p,
      top_k,
      vad_threshold,
      vad_prefix_padding_ms,
      vad_silence_duration_ms
    } = req.body;

    // Request ephemeral token from Luna backend
    const backendUrl = BACKEND_URL.replace(/\/$/, '');
    const response = await fetch(`${backendUrl}/v1/realtime/client_secrets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Luna-Key': `Bearer ${AUTH_KEY}`,  // Your main API key (server-side only!)
      },
      body: JSON.stringify({
        session: {
          model: 'lunav1',
          voice: 'base',
          instructions: custom_prompt || 'You are a helpful and friendly AI assistant.',
          temperature: temperature || 0.8,
          top_p: top_p || 0.95,
          top_k: top_k || 50,
          turn_detection: {
            type: 'server_vad',
            threshold: vad_threshold || 0.5,
            prefix_padding_ms: vad_prefix_padding_ms || 300,
            silence_duration_ms: vad_silence_duration_ms || 500,
          },
          input_audio_transcription: {
            model: 'lunav1'
          }
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to create ephemeral token:', errorText);
      return res.status(response.status).json({ 
        error: 'Failed to create ephemeral token',
        details: errorText 
      });
    }

    const data = await response.json();

    console.log(data.value)

    // Return ephemeral token to client
    // Token format: "eph_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    // Expires in 5 minutes, one-time use
    return res.status(200).json({
      value: data.value,
      expires_at: data.expires_at,
    });

  } catch (error: any) {
    console.error('Ephemeral token generation error:', error);
    return res.status(502).json({ 
      error: 'Failed to generate ephemeral token', 
      details: error.message 
    });
  }
}

