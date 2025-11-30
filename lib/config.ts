/**
 * Application Configuration
 * 
 * Centralized configuration for Luna API integration.
 * 
 * All API calls go through Next.js API routes for security:
 * - Frontend calls Next.js API routes (/api/*)
 * - Next.js API routes proxy to Luna backend with authentication
 * - This keeps AUTH_KEY and BACKEND_URL server-side only
 */

// API endpoints (Next.js routes that proxy to Luna backend)
export const API_ENDPOINTS = {
  // WebRTC endpoints
  ICE_SERVERS: '/api/ice-servers',       // Fetches STUN/TURN servers
  OFFER: '/api/offer',                   // WebRTC offer/answer exchange
  
  // Plivo telephony endpoints
  PLIVO_CONFIGURE: '/api/plivo/configure', // Generate config token
  PLIVO_ANSWER: '/api/plivo/answer',       // Plivo XML answer URL
  PLIVO_CALL: '/api/plivo/call',           // Initiate outbound call
} as const;

export default {
  API_ENDPOINTS,
};

