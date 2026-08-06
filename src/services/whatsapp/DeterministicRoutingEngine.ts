/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { InboundEventContract } from './NormalizedEventContracts';
import { ConsentService } from './ConsentService';
import { ActiveFlowService } from './ActiveFlowService';
import { logger } from '../metadata/logger';

export type RouteCategory =
  | 'OPT_OUT'
  | 'OPT_IN'
  | 'ACTIVE_FLOW'
  | 'LOCATION_OR_HOURS'
  | 'FAQ_DETERMINISTIC'
  | 'APPOINTMENT_INTENT'
  | 'RESCHEDULE_INTENT'
  | 'CANCELLATION_INTENT'
  | 'PAYMENT_INTENT'
  | 'HUMAN_HANDOVER'
  | 'UNSUPPORTED_MESSAGE'
  | 'AI_ELIGIBLE_FUTURE';

export interface RouteResult {
  routeCategory: RouteCategory;
  confidenceClass: 'HIGH' | 'MEDIUM' | 'LOW';
  reasonCode: string;
  deterministicResponseText?: string;
  requiresHandover: boolean;
  flowStep?: string;
}

export class DeterministicRoutingEngine {
  /**
   * Deterministically evaluates inbound event and determines routing & approved response
   */
  public static async routeInboundEvent(event: InboundEventContract, activeFlow?: any): Promise<RouteResult> {
    const text = event.sanitizedText || '';
    const textLower = text.toLowerCase().trim();

    // Priority 1: Compliance Opt-Out Command
    const consentCmd = ConsentService.evaluateConsentCommand(text);
    if (consentCmd === 'OPT_OUT') {
      return {
        routeCategory: 'OPT_OUT',
        confidenceClass: 'HIGH',
        reasonCode: 'OPT_OUT_COMMAND_RECEIVED',
        deterministicResponseText: 'You have been unsubscribed from WhatsApp automated updates. Text START anytime to re-subscribe.',
        requiresHandover: true,
      };
    }

    // Priority 2: Compliance Opt-In Command
    if (consentCmd === 'OPT_IN') {
      return {
        routeCategory: 'OPT_IN',
        confidenceClass: 'HIGH',
        reasonCode: 'OPT_IN_COMMAND_RECEIVED',
        deterministicResponseText: 'Welcome back! You have re-subscribed to clinic WhatsApp notifications.',
        requiresHandover: false,
      };
    }

    // Priority 3: Active Flow Continuation
    if (activeFlow && activeFlow.status === 'active') {
      const flowResult = ActiveFlowService.handleFlowTransition(activeFlow, event);
      if (flowResult) {
        return flowResult;
      }
    }

    // Priority 4: Exact Interactive Reply Identifier
    if (event.messageType === 'interactive_button' || event.messageType === 'interactive_list') {
      const interactionId = event.interactionIdentifier?.toLowerCase() || '';
      if (interactionId.includes('hours') || interactionId.includes('location')) {
        return {
          routeCategory: 'LOCATION_OR_HOURS',
          confidenceClass: 'HIGH',
          reasonCode: 'INTERACTIVE_HOURS_CLICK',
          deterministicResponseText: 'Our clinic hours are Mon-Sat 9:00 AM - 7:00 PM. Please visit our website or call reception for location details.',
          requiresHandover: false,
        };
      }
      if (interactionId.includes('appointment') || interactionId.includes('book')) {
        return {
          routeCategory: 'APPOINTMENT_INTENT',
          confidenceClass: 'HIGH',
          reasonCode: 'INTERACTIVE_APPOINTMENT_CLICK',
          deterministicResponseText: 'Thank you for your interest in booking an appointment. Our reception staff will assist you shortly with available doctor slots.',
          requiresHandover: true,
        };
      }
    }

    // Priority 5: Configured Clinic Keywords / Intent match
    if (event.messageType === 'text') {
      if (textLower.match(/\b(hours|timings|open|timing|address|location|map|directions)\b/)) {
        return {
          routeCategory: 'LOCATION_OR_HOURS',
          confidenceClass: 'HIGH',
          reasonCode: 'KEYWORD_LOCATION_HOURS',
          deterministicResponseText: 'Clinic Hours: Mon-Sat 9:00 AM - 7:00 PM. Location: Main Clinic Branch. Call us or stay tuned for reception assistance.',
          requiresHandover: false,
        };
      }

      if (textLower.match(/\b(reschedule|change time|move appointment)\b/)) {
        return {
          routeCategory: 'RESCHEDULE_INTENT',
          confidenceClass: 'HIGH',
          reasonCode: 'KEYWORD_RESCHEDULE',
          deterministicResponseText: 'We received your request to reschedule. A clinic team member will check the schedule and update your appointment.',
          requiresHandover: true,
        };
      }

      if (textLower.match(/\b(cancel|cancellation)\b/)) {
        return {
          routeCategory: 'CANCELLATION_INTENT',
          confidenceClass: 'HIGH',
          reasonCode: 'KEYWORD_CANCEL',
          deterministicResponseText: 'We noted your request to cancel. A staff member will process this cancellation shortly.',
          requiresHandover: true,
        };
      }

      if (textLower.match(/\b(book|appointment|doctor|consult|consultation|slot)\b/)) {
        return {
          routeCategory: 'APPOINTMENT_INTENT',
          confidenceClass: 'MEDIUM',
          reasonCode: 'KEYWORD_APPOINTMENT_INQUIRY',
          deterministicResponseText: 'Thank you for reaching out to schedule a consultation. A team member will verify available slots and confirm your appointment.',
          requiresHandover: true,
        };
      }

      if (textLower.match(/\b(price|cost|fee|charge|bill|payment)\b/)) {
        return {
          routeCategory: 'PAYMENT_INTENT',
          confidenceClass: 'MEDIUM',
          reasonCode: 'KEYWORD_PAYMENT_INQUIRY',
          deterministicResponseText: 'For detailed consultation and treatment fees, our front desk team will contact you directly with our standard rate card.',
          requiresHandover: true,
        };
      }
    }

    // Priority 6: Unsupported Message Type (Image, Document, Audio, Video, Location without flow)
    if (['image', 'document', 'audio', 'video', 'location', 'contact', 'unsupported'].includes(event.messageType)) {
      return {
        routeCategory: 'UNSUPPORTED_MESSAGE',
        confidenceClass: 'HIGH',
        reasonCode: `UNSUPPORTED_TYPE_${event.messageType.toUpperCase()}`,
        deterministicResponseText: 'Thank you for sharing your document/media. Our medical team has received it and will review it during reception hours.',
        requiresHandover: true,
      };
    }

    // Priority 7: Fallback Low Confidence / Ambiguous
    logger.info('DeterministicRoutingEngine', `Uncertain message routed to human handover: "${text.substring(0, 30)}..."`);
    return {
      routeCategory: 'HUMAN_HANDOVER',
      confidenceClass: 'LOW',
      reasonCode: 'AMBIGUOUS_ROUTING_FALLBACK',
      deterministicResponseText: 'Thank you for your message. Our reception team will review your request and get back to you shortly.',
      requiresHandover: true,
    };
  }
}
