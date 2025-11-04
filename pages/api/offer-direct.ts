import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * WebRTC Direct Connection Endpoint
 * 
 * This uses your main API key directly (less secure but simpler).
 * 
 * ⚠️ Security Note:
 * - Your main API key is used server-side only (secure)
 * - However, all session config comes from client (less control)
 * - For production, use ephemeral tokens instead (/api/ephemeral-key + /api/offer)
 * 
 * Use this for:
 * - Development/testing
 * - When you trust the client
 * - When you don't need ephemeral tokens
 */

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
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
      sdp, 
      custom_prompt, 
      temperature, 
      top_p, 
      top_k,
      vad_threshold,
      vad_prefix_padding_ms,
      vad_silence_duration_ms
    } = req.body;

    if (!sdp) {
      return res.status(400).json({ error: 'Missing SDP in request' });
    }

    // Build session config
    const sessionConfig = JSON.stringify({
      type: 'realtime',
      model: 'lunav1',
      audio: {
        output: { voice: 'base' }
      },
      turn_detection: {
        type: 'server_vad',
        threshold: vad_threshold || 0.5,
        prefix_padding_ms: vad_prefix_padding_ms || 300,
        silence_duration_ms: vad_silence_duration_ms || 500
      },
      input_audio_transcription: {
        model: 'lunav1'
      },
      instructions: custom_prompt || 'You are a helpful and friendly AI assistant.',
      temperature: temperature || 0.8,
      top_p: top_p || 0.95,
      top_k: top_k || 50
    });

    // Create FormData for Luna API
    const formData = new FormData();
    formData.append('sdp', sdp);
    formData.append('session', sessionConfig);

    // Direct call with main API key
    const backendUrl = BACKEND_URL.replace(/\/$/, '');
    const response = await fetch(`${backendUrl}/v1/realtime/calls`, {
      method: 'POST',
      headers: {
        'X-Luna-Key': `Bearer ${AUTH_KEY}`,  // Main API key (server-side only)
      },
      body: formData,
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

    // Return SDP answer
    res.status(200).send(answer);
  } catch (error: any) {
    res.status(502).json({ error: 'Failed to connect to backend', details: error.message });
  }
}

