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
  ICE_SERVERS: '/api/ice-servers',  // Fetches STUN/TURN servers
  OFFER: '/api/offer',              // WebRTC offer/answer exchange
} as const;

export default {
  API_ENDPOINTS,
};

