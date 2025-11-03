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

  // Luna backend configuration
  const backendUrl = process.env.BACKEND_URL?.replace(/\/$/, '');
  const targetUrl = `${backendUrl}/v1/realtime/calls`;

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

    // Build OpenAI-compatible session config
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
      input_audio_transcription: {  // enables transcripts
        "model": "lunav1"
      },
      instructions: custom_prompt || 'You are Luna, a helpful AI assistant.',
      temperature: temperature || 0.8,
      top_p: top_p || 0.95,
      top_k: top_k || 50
    });

    // Create multipart form data as expected by Luna API
    const formData = new FormData();
    formData.append('sdp', sdp);
    formData.append('session', sessionConfig);

    // Send request to Luna backend
    // Key difference from OpenAI: Uses X-Luna-Key header
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'X-Luna-Key': `Bearer ${process.env.AUTH_KEY}`,
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

    // Return the answer as plain text (SDP)
    res.status(200).send(answer);
  } catch (error: any) {
    res.status(502).json({ error: 'Failed to connect to backend', details: error.message });
  }
}
