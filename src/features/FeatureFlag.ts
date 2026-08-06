/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type FeatureFlag =
  | 'APPOINTMENTS'
  | 'PATIENTS'
  | 'FOLLOWUPS'
  | 'WHATSAPP'
  | 'REPORTS'
  | 'BILLING'
  | 'CALENDAR'
  | 'AI_ASSISTANT';

export const VALID_FEATURE_FLAGS: Set<string> = new Set<string>([
  'APPOINTMENTS',
  'PATIENTS',
  'FOLLOWUPS',
  'WHATSAPP',
  'REPORTS',
  'BILLING',
  'CALENDAR',
  'AI_ASSISTANT',
]);
