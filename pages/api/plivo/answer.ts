import type { NextApiRequest, NextApiResponse } from 'next';
const plivo = require('plivo');

/**
 * Plivo Answer URL Endpoint
 * 
 * Returns Plivo XML using the official SDK.
 */

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const BACKEND_URL = process.env.BACKEND_URL;
  const AUTH_KEY = process.env.AUTH_KEY;

  if (!BACKEND_URL || !AUTH_KEY) {
    return res.status(500).send('<!-- Configuration Error -->');
  }

  // Get params
  const params = req.method === 'GET' ? req.query : { ...req.query, ...req.body };
  
  // Build stream URL
  const backendUrl = BACKEND_URL.replace(/\/$/, '');
  const backendHost = backendUrl.replace(/^https?:\/\//, '');
  const wsProtocol = backendUrl.startsWith('https') ? 'wss' : 'ws';
  
  const streamParams = new URLSearchParams();
  streamParams.set('api_key', AUTH_KEY);
  
  if (params.config_token) streamParams.set('config_token', params.config_token as string);
  if (params.temperature) streamParams.set('temperature', params.temperature as string);
  if (params.silence_timeout) streamParams.set('silence_timeout', params.silence_timeout as string);
  if (params.vad_threshold) streamParams.set('vad_threshold', params.vad_threshold as string);

  const streamUrl = `${wsProtocol}://${backendHost}/plivo/stream?${streamParams.toString()}`;
  console.log(`[Plivo Answer] Stream URL: ${streamUrl}`);

  // Generate XML using SDK
  const response = new plivo.Response();
  
  // Add Stream element
  // @ts-ignore - SDK types might not be fully up to date for Stream element
  response.addStream(streamUrl, {
    bidirectional: true,
    contentType: 'audio/x-l16;rate=8000',
    streamTimeout: 86400, // 24 hours
    keepCallAlive: true,
  });

  const xml = response.toXML();
  
  res.setHeader('Content-Type', 'application/xml');
  res.status(200).send(xml);
}
