/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface StructuredLogMeta {
  requestId?: string;
  tenantId?: string;
  firebaseUid?: string;
  service?: string;
  operation?: string;
  durationMs?: number;
  status?: 'SUCCESS' | 'FAILED' | 'PENDING' | string;
  [key: string]: any;
}

export const logger = {
  info(context: string, message: string, meta?: StructuredLogMeta) {
    const serviceName = meta?.service || context;
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'INFO',
        service: serviceName,
        message,
        requestId: meta?.requestId,
        tenantId: meta?.tenantId,
        firebaseUid: meta?.firebaseUid,
        operation: meta?.operation,
        durationMs: meta?.durationMs,
        status: meta?.status || 'SUCCESS',
        ...logger.filterStructuredKeys(meta),
      })
    );
  },

  warn(context: string, message: string, meta?: StructuredLogMeta) {
    const serviceName = meta?.service || context;
    console.warn(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'WARN',
        service: serviceName,
        message,
        requestId: meta?.requestId,
        tenantId: meta?.tenantId,
        firebaseUid: meta?.firebaseUid,
        operation: meta?.operation,
        durationMs: meta?.durationMs,
        status: meta?.status || 'WARNING',
        ...logger.filterStructuredKeys(meta),
      })
    );
  },

  error(context: string, message: string, error?: any, meta?: StructuredLogMeta) {
    const serviceName = meta?.service || context;
    const errorDetails = error instanceof Error 
      ? { name: error.name, message: error.message, stack: error.stack }
      : error;

    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'ERROR',
        service: serviceName,
        message,
        error: errorDetails,
        requestId: meta?.requestId,
        tenantId: meta?.tenantId,
        firebaseUid: meta?.firebaseUid,
        operation: meta?.operation,
        durationMs: meta?.durationMs,
        status: meta?.status || 'FAILED',
        ...logger.filterStructuredKeys(meta),
      })
    );
  },

  /**
   * Helper to strip out keys that are explicitly placed at top-level
   */
  filterStructuredKeys(meta?: StructuredLogMeta): Record<string, any> {
    if (!meta) return {};
    const { requestId, tenantId, firebaseUid, service, operation, durationMs, status, ...rest } = meta;
    return rest;
  }
};
