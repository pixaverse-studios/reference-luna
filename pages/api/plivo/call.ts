import type { NextApiRequest, NextApiResponse } from 'next';
const plivo = require('plivo');

/**
 * Plivo Outbound Call Endpoint
 * 
 * Initiates an outbound call using the official Plivo Node.js SDK.
 */

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const PLIVO_AUTH_ID = process.env.PLIVO_AUTH_ID;
  const PLIVO_AUTH_TOKEN = process.env.PLIVO_AUTH_TOKEN;
  const BACKEND_URL = process.env.BACKEND_URL;
  const AUTH_KEY = process.env.AUTH_KEY;

  if (!PLIVO_AUTH_ID || !PLIVO_AUTH_TOKEN) {
    return res.status(500).json({ error: 'Plivo credentials missing' });
  }

  if (!BACKEND_URL || !AUTH_KEY) {
    return res.status(500).json({ error: 'Luna configuration missing' });
  }

  try {
    const { 
      to_number, 
      from_number, 
      instructions, 
      temperature, 
      silence_timeout 
    } = req.body;

    // Initialize Plivo client
    const client = new plivo.Client(PLIVO_AUTH_ID, PLIVO_AUTH_TOKEN);

    // Step 1: Generate config token if instructions provided
    let configToken: string | undefined;
    
    if (instructions) {
      const configResponse = await fetch(`${BACKEND_URL.replace(/\/$/, '')}/plivo/configure`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Luna-Key': `Bearer ${AUTH_KEY}`,
        },
        body: JSON.stringify({
          instructions,
          temperature: temperature || 0.8,
          silence_timeout: silence_timeout || 30,
        }),
      });

      if (configResponse.ok) {
        const configData = await configResponse.json();
        configToken = configData.config_token;
      } else {
        console.error('[Plivo Call] Config generation failed:', await configResponse.text());
      }
    }

    // Step 2: Build answer URL
    const host = req.headers.host;
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    let answerUrl = `${protocol}://${host}/api/plivo/answer`;
    
    const params = new URLSearchParams();
    if (configToken) {
      params.set('config_token', configToken);
    } else {
      if (temperature) params.set('temperature', String(temperature));
      if (silence_timeout) params.set('silence_timeout', String(silence_timeout));
    }
    
    const finalAnswerUrl = `${answerUrl}?${params.toString()}`;
    console.log(`[Plivo Call] Initiating call to ${to_number} with AnswerURL: ${finalAnswerUrl}`);

    // Step 3: Make call using SDK
    const response = await client.calls.create(
      from_number,
      to_number,
      finalAnswerUrl,
      {
        answerMethod: 'GET',
      }
    );

    console.log('[Plivo Call] Success:', response);

    res.status(200).json({
      success: true,
      call_uuid: response.requestUuid,
      message: response.message,
      answer_url: finalAnswerUrl,
    });

  } catch (error: any) {
    console.error('[Plivo Call] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to initiate call' });
  }
}
