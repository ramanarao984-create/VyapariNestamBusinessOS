/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleOAuthService } from '../../google/GoogleOAuthService';
import { logger } from '../metadata/logger';

export interface CalendarSyncResult {
  success: boolean;
  googleEventId?: string;
  outcome: 'CREATED' | 'UPDATED' | 'CANCELLED' | 'RECONNECTION_REQUIRED' | 'SKIPPED_NOT_CONNECTED' | 'FAILED';
  error?: string;
}

export class GoogleCalendarWorkflowService {
  /**
   * Sync a new appointment booking to Google Calendar
   */
  public static async syncBooking(
    tenantId: string,
    appointment: {
      id: string;
      patientName: string;
      doctorName?: string;
      date: string; // YYYY-MM-DD
      time: string; // e.g., "10:00 AM" or "10:00 AM - 11:00 AM"
      treatment?: string;
      notes?: string;
    },
    timezone: string = 'Asia/Kolkata'
  ): Promise<CalendarSyncResult> {
    try {
      let accessToken: string;
      try {
        accessToken = await GoogleOAuthService.getValidAccessToken(tenantId);
      } catch (authErr: any) {
        logger.warn('GoogleCalendarWorkflowService', `OAuth token unavailable for tenant ${tenantId}`, authErr);
        return {
          success: false,
          outcome: 'RECONNECTION_REQUIRED',
          error: 'Google OAuth token expired or disconnected. Re-authentication required.'
        };
      }

      // Format ISO start/end
      const startIso = this.formatDateTimeIso(appointment.date, appointment.time, 0);
      const endIso = this.formatDateTimeIso(appointment.date, appointment.time, 60);

      const eventPayload = {
        summary: `${appointment.treatment || 'Appointment'} - ${appointment.patientName}`,
        description: `Patient: ${appointment.patientName}\nDoctor: ${appointment.doctorName || 'Assigned Specialist'}\nTreatment: ${appointment.treatment || 'Consultation'}\nAppt ID: ${appointment.id}\nNotes: ${appointment.notes || 'N/A'}`,
        start: { dateTime: startIso, timeZone: timezone },
        end: { dateTime: endIso, timeZone: timezone }
      };

      const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventPayload)
      });

      if (res.status === 401 || res.status === 403) {
        return {
          success: false,
          outcome: 'RECONNECTION_REQUIRED',
          error: 'Google Calendar API unauthorized. OAuth re-connection required.'
        };
      }

      if (!res.ok) {
        const errText = await res.text();
        return {
          success: false,
          outcome: 'FAILED',
          error: `Google Calendar API error: ${res.status} ${errText}`
        };
      }

      const eventData: any = await res.json();
      return {
        success: true,
        googleEventId: eventData.id,
        outcome: 'CREATED'
      };
    } catch (err: any) {
      logger.error('GoogleCalendarWorkflowService', 'Exception in syncBooking', err);
      return {
        success: false,
        outcome: 'FAILED',
        error: err.message || 'Failed to sync appointment booking to Google Calendar.'
      };
    }
  }

  /**
   * Update an existing Google Calendar event on rescheduling
   */
  public static async updateEvent(
    tenantId: string,
    googleEventId: string,
    appointment: {
      patientName: string;
      date: string;
      time: string;
      treatment?: string;
    },
    timezone: string = 'Asia/Kolkata'
  ): Promise<CalendarSyncResult> {
    try {
      let accessToken: string;
      try {
        accessToken = await GoogleOAuthService.getValidAccessToken(tenantId);
      } catch {
        return {
          success: false,
          outcome: 'RECONNECTION_REQUIRED',
          error: 'OAuth reconnection required.'
        };
      }

      const startIso = this.formatDateTimeIso(appointment.date, appointment.time, 0);
      const endIso = this.formatDateTimeIso(appointment.date, appointment.time, 60);

      const eventPayload = {
        summary: `${appointment.treatment || 'Appointment'} - ${appointment.patientName} (Rescheduled)`,
        start: { dateTime: startIso, timeZone: timezone },
        end: { dateTime: endIso, timeZone: timezone }
      };

      const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventPayload)
      });

      if (!res.ok) {
        return {
          success: false,
          outcome: 'FAILED',
          error: `Failed to update calendar event ${googleEventId}`
        };
      }

      return {
        success: true,
        googleEventId,
        outcome: 'UPDATED'
      };
    } catch (err: any) {
      return {
        success: false,
        outcome: 'FAILED',
        error: err.message
      };
    }
  }

  /**
   * Cancel / Delete an existing Google Calendar event
   */
  public static async cancelEvent(tenantId: string, googleEventId: string): Promise<CalendarSyncResult> {
    try {
      let accessToken: string;
      try {
        accessToken = await GoogleOAuthService.getValidAccessToken(tenantId);
      } catch {
        return {
          success: false,
          outcome: 'RECONNECTION_REQUIRED',
          error: 'OAuth reconnection required.'
        };
      }

      const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (!res.ok && res.status !== 404) {
        return {
          success: false,
          outcome: 'FAILED',
          error: `Failed to delete calendar event ${googleEventId}`
        };
      }

      return {
        success: true,
        googleEventId,
        outcome: 'CANCELLED'
      };
    } catch (err: any) {
      return {
        success: false,
        outcome: 'FAILED',
        error: err.message
      };
    }
  }

  private static formatDateTimeIso(dateStr: string, timeStr: string, offsetMinutes: number): string {
    const cleanDate = dateStr || new Date().toISOString().split('T')[0];
    let hours = 10;
    let mins = 0;

    const timeMatch = (timeStr || '').match(/(\d{1,2}):?(\d{2})?\s*(am|pm|AM|PM)?/i);
    if (timeMatch) {
      hours = parseInt(timeMatch[1], 10);
      mins = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      const ampm = timeMatch[3] ? timeMatch[3].toLowerCase() : '';
      if (ampm === 'pm' && hours < 12) hours += 12;
      if (ampm === 'am' && hours === 12) hours = 0;
    }

    const dt = new Date(`${cleanDate}T${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:00`);
    if (isNaN(dt.getTime())) {
      return new Date(Date.now() + offsetMinutes * 60000).toISOString();
    }
    dt.setMinutes(dt.getMinutes() + offsetMinutes);
    return dt.toISOString();
  }
}
