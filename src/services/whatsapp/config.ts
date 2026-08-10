/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Centralized Meta WhatsApp Cloud API Configuration
 */
export const WHATSAPP_CONFIG = {
  /**
   * Official supported Meta Graph API version used across all services
   */
  GRAPH_API_VERSION: process.env.META_GRAPH_API_VERSION || 'v21.0',

  /**
   * Meta Graph API Base Endpoint
   */
  GRAPH_API_BASE_URL: 'https://graph.facebook.com',

  /**
   * Meta App Secret for x-hub-signature-256 HMAC validation
   */
  META_APP_SECRET: process.env.META_APP_SECRET || process.env.WHATSAPP_APP_SECRET || '',

  /**
   * Maximum outbound send attempt retries for transient errors
   */
  MAX_RETRIES: 3,

  /**
   * Base retry delay in milliseconds
   */
  RETRY_BASE_DELAY_MS: 500,
};

/**
 * Helper to construct a full Graph API URL for a resource path
 */
export function getMetaGraphUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${WHATSAPP_CONFIG.GRAPH_API_BASE_URL}/${WHATSAPP_CONFIG.GRAPH_API_VERSION}/${cleanPath}`;
}
