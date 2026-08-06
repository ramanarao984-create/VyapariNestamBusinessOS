/**
 * Vyapari Nestam CRM - Multi-Tenant Google Apps Script Middleman Router
 * 
 * Instructions:
 * 1. Open Google Apps Script (script.google.com).
 * 2. Create a new project and paste this entire code.
 * 3. Deploy as a Web App:
 *    - Click "Deploy" > "New deployment".
 *    - Select type: "Web app".
 *    - Set "Execute as": "Me (your-gmail@gmail.com)" (acts as the server/middleware).
 *    - Set "Who has access": "Anyone" (required for Meta Webhooks and API callback triggers).
 * 4. Copy the Web App URL (this will be your Webhook URL and API routing endpoint).
 * 
 * Features:
 * - Secure Meta WhatsApp Webhook handshaking (doGet).
 * - Multi-tenant routing and client data isolation.
 * - Dynamic patient onboarding and Spreadsheet insertion.
 * - Server-to-Server Google Calendar creation using Client Access Tokens.
 * - Secure WhatsApp delivery via Meta Cloud API using stored permanent tokens.
 */

// Secure Verification Token for Meta Developer Portal Webhook Verification
const WEBHOOK_VERIFY_TOKEN = "nestam_crm_secure_token";

// Master Tenant Directory Database (Mock DB/Key-Store represented as an Array of Client Records)
// In a highly optimized flow, this can also reside on a dedicated "Master Tenant" Google Sheet.
const TENANT_DIRECTORY = [
  {
    clinicId: "tenant_001",
    ownerEmail: "ramanarao984@gmail.com",
    clinicName: "Vijayawada Dental Care",
    spreadsheetId: "1-example-spreadsheet-id-tenant-1",
    metaPhoneNumberId: "123456789012345",
    metaWabaId: "987654321098765",
    // Keep Meta Permanent Tokens encrypted/secured here
    metaPermanentToken: "EAAGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  },
  {
    clinicId: "tenant_002",
    ownerEmail: "doctor2@example.com",
    clinicName: "Venkateswara Skin & Hair Clinic",
    spreadsheetId: "1-example-spreadsheet-id-tenant-2",
    metaPhoneNumberId: "123456789012346",
    metaWabaId: "987654321098766",
    metaPermanentToken: "EAAGyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy"
  }
];

/**
 * 1. GET REQUEST HANDLER: doGet(e)
 * Handles the official Meta Developer Webhook validation handshake.
 */
function doGet(e) {
  try {
    Logger.log("[GET] Request received: " + JSON.stringify(e));
    
    const params = e.parameter;
    const mode = params["hub.mode"];
    const token = params["hub.verify_token"];
    const challenge = params["hub.challenge"];
    
    // Evaluate Meta subscription handshake
    if (mode === "subscribe" && token === WEBHOOK_VERIFY_TOKEN) {
      Logger.log("[GET] Meta Webhook verified successfully!");
      return ContentService.createTextOutput(challenge)
        .setMimeType(ContentService.MimeType.TEXT);
    }
    
    // Return unauthorized status if verify token mismatch
    Logger.log("[GET] Unauthorized webhook handshake attempt or general ping.");
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: "Unauthorized request. Incomplete or invalid verification token."
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    Logger.log("[GET Error] " + err.toString());
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: "Internal server error: " + err.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 2. POST REQUEST HANDLER: doPost(e)
 * Evaluates the action token parameter inside incoming JSON payloads
 * and routes to the appropriate tenant operation helper.
 */
function doPost(e) {
  try {
    Logger.log("[POST] Request received.");
    
    // Handle empty payloads safely
    if (!e.postData || !e.postData.contents) {
      return jsonResponse({ status: "error", message: "Payload empty" }, 400);
    }
    
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;
    
    Logger.log("[POST] Resolving action: " + action);
    
    switch (action) {
      case "onboard_patient":
        return handleOnboardPatient(payload);
        
      case "sync_calendar":
        return handleSyncCalendar(payload);
        
      case "send_whatsapp":
        return handleSendWhatsApp(payload);
        
      default:
        return jsonResponse({
          status: "error",
          message: "Unsupported action token: '" + action + "'"
        }, 400);
    }
    
  } catch (err) {
    Logger.log("[POST Error] Global crash: " + err.toString());
    return jsonResponse({
      status: "error",
      message: "Failed parsing or routing payload: " + err.message
    }, 500);
  }
}

/**
 * ACTION ROUTER 1: handleOnboardPatient
 * Onboards patient by resolving clinic owner sheet ID and appending to target sheet grid.
 */
function handleOnboardPatient(payload) {
  try {
    const email = payload.clinicOwnerEmail || payload.email;
    const patientData = payload.patient || {};
    
    if (!email) {
      return jsonResponse({ status: "error", message: "clinicOwnerEmail is required to locate tenant sheet." }, 400);
    }
    
    // 1. Resolve Spreadsheet ID via BYOS tenant database lookup
    const sheetId = lookupClientSheetId(email) || payload.fallbackSpreadsheetId;
    if (!sheetId) {
      return jsonResponse({ 
        status: "error", 
        message: "No registered spreadsheet found for this tenant email: " + email 
      }, 404);
    }
    
    Logger.log("[Onboard] Tenant found. Target sheet: " + sheetId);
    
    // 2. Open client spreadsheet
    const ss = SpreadsheetApp.openById(sheetId);
    let targetSheet = ss.getSheetByName("CRM_Contacts");
    if (!targetSheet) {
      targetSheet = ss.getSheets()[0]; // Fallback to first tab
    }
    
    // 3. Construct contact row array
    const timestamp = Utilities.formatDate(new Date(), "GMT+5:30", "yyyy-MM-dd HH:mm:ss");
    const rowData = [
      patientData.id || "C_" + Math.floor(Math.random() * 1000000),
      patientData.name || "Anonymous",
      patientData.phone || "",
      patientData.email || "",
      patientData.city || "Vijayawada",
      patientData.pipelineStage || "Inquiry",
      patientData.treatmentType || "",
      patientData.amountCollected || 0,
      patientData.notes || "",
      timestamp
    ];
    
    targetSheet.appendRow(rowData);
    Logger.log("[Onboard] Row successfully appended to CRM_Contacts.");
    
    return jsonResponse({
      status: "success",
      message: "Patient onboarded successfully onto tenant spreadsheet.",
      sheetId: sheetId
    });
    
  } catch (err) {
    Logger.log("[Onboard Error] Failed: " + err.toString());
    return jsonResponse({ status: "error", message: "Onboarding failed: " + err.message }, 500);
  }
}

/**
 * ACTION ROUTER 2: handleSyncCalendar
 * Uses the client's localized Google Access Token to write calendar blocks securely.
 */
function handleSyncCalendar(payload) {
  try {
    const googleAccessToken = payload.googleAccessToken;
    const eventData = payload.event || {};
    
    if (!googleAccessToken) {
      return jsonResponse({ status: "error", message: "googleAccessToken is required for localized Google OAuth calendar sync." }, 400);
    }
    
    if (!eventData.summary || !eventData.startTime || !eventData.endTime) {
      return jsonResponse({ status: "error", message: "Event details (summary, startTime, endTime) are incomplete." }, 400);
    }
    
    Logger.log("[SyncCalendar] Issuing secure server-to-server HTTP request to localized Calendar API...");
    
    // Construct Direct Google Calendar REST API payload
    const calendarApiUrl = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
    
    const postBody = {
      summary: eventData.summary,
      description: eventData.description || "Synced via Vyapari Nestam CRM Serverless Co-pilot Router",
      start: {
        dateTime: eventData.startTime, // ISO 8601 string (e.g. "2026-07-18T10:00:00+05:30")
        timeZone: "Asia/Kolkata"
      },
      end: {
        dateTime: eventData.endTime, // ISO 8601 string (e.g. "2026-07-18T11:00:00+05:30")
        timeZone: "Asia/Kolkata"
      }
    };
    
    const options = {
      method: "post",
      contentType: "application/json",
      headers: {
        Authorization: "Bearer " + googleAccessToken
      },
      payload: JSON.stringify(postBody),
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(calendarApiUrl, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    Logger.log("[SyncCalendar] Google API response code: " + responseCode);
    
    if (responseCode >= 200 && responseCode < 300) {
      const parsedRes = JSON.parse(responseText);
      return jsonResponse({
        status: "success",
        message: "Calendar event successfully synced directly into client's Google Calendar.",
        eventId: parsedRes.id,
        htmlLink: parsedRes.htmlLink
      });
    } else {
      return jsonResponse({
        status: "error",
        message: "Google Calendar API rejected synchronization payload.",
        details: responseText
      }, responseCode);
    }
    
  } catch (err) {
    Logger.log("[SyncCalendar Error] Failed: " + err.toString());
    return jsonResponse({ status: "error", message: "Google Calendar Sync failed: " + err.message }, 500);
  }
}

/**
 * ACTION ROUTER 3: handleSendWhatsApp
 * Pulls clinic secure Meta details, posts Graph payload, and logs the outcome to client's sheets.
 */
function handleSendWhatsApp(payload) {
  try {
    const tenantId = payload.tenantId;
    const recipientPhone = payload.recipientPhone;
    const messageText = payload.messageText;
    
    if (!tenantId || !recipientPhone || !messageText) {
      return jsonResponse({ status: "error", message: "Incomplete parameters. 'tenantId', 'recipientPhone', and 'messageText' are required." }, 400);
    }
    
    // 1. Identify targeting account from secure tenant array
    const tenant = getTenantConfig(tenantId);
    if (!tenant) {
      return jsonResponse({ status: "error", message: "Tenant Id not registered." }, 404);
    }
    
    const metaToken = tenant.metaPermanentToken;
    const phoneId = tenant.metaPhoneNumberId;
    const sheetId = tenant.spreadsheetId;
    
    Logger.log("[WhatsApp] Found tenant details. Delivering to phone: " + recipientPhone);
    
    // 2. Issue server-to-server POST trigger out to Meta's graph API
    const metaApiUrl = "https://graph.facebook.com/v17.0/" + phoneId + "/messages";
    
    const whatsappPayload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: formatPhoneNumber(recipientPhone),
      type: "text",
      text: {
        preview_url: false,
        body: messageText
      }
    };
    
    const options = {
      method: "post",
      contentType: "application/json",
      headers: {
        Authorization: "Bearer " + metaToken
      },
      payload: JSON.stringify(whatsappPayload),
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(metaApiUrl, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    Logger.log("[WhatsApp] Meta API Response Code: " + responseCode);
    
    const isSuccess = (responseCode >= 200 && responseCode < 300);
    const metaResult = JSON.parse(responseText);
    
    // 3. Write transmission log into Client's internal sheets to preserve offline records
    try {
      if (sheetId && sheetId.indexOf("example") === -1) { // Only log if valid sheet configured
        const ss = SpreadsheetApp.openById(sheetId);
        let logSheet = ss.getSheetByName("CRM_Interactions");
        if (!logSheet) {
          logSheet = ss.getSheets()[0];
        }
        
        const timestamp = Utilities.formatDate(new Date(), "GMT+5:30", "yyyy-MM-dd HH:mm:ss");
        logSheet.appendRow([
          "LOG_" + Math.floor(Math.random() * 1000000),
          recipientPhone,
          "WhatsApp OUT",
          messageText,
          timestamp,
          isSuccess ? "Delivered" : "Failed",
          isSuccess ? "Meta Message ID: " + (metaResult.messages?.[0]?.id || "unknown") : "Error: " + responseText
        ]);
        Logger.log("[WhatsApp] Log successfully written to CRM_Interactions.");
      }
    } catch (logErr) {
      Logger.log("[WhatsApp Log Warning] Failed writing log to sheet: " + logErr.toString());
    }
    
    if (isSuccess) {
      return jsonResponse({
        status: "success",
        message: "WhatsApp message dispatched successfully.",
        messageId: metaResult.messages?.[0]?.id || "unknown"
      });
    } else {
      return jsonResponse({
        status: "error",
        message: "Meta Cloud API rejected the whatsapp delivery payload.",
        details: metaResult
      }, responseCode);
    }
    
  } catch (err) {
    Logger.log("[WhatsApp Error] Failed: " + err.toString());
    return jsonResponse({ status: "error", message: "WhatsApp dispatch failed: " + err.message }, 500);
  }
}

/**
 * HELPER: lookupClientSheetId
 * Performs isolated lookups to match Owner email to target spreadsheet ID.
 */
function lookupClientSheetId(email) {
  if (!email) return null;
  const match = TENANT_DIRECTORY.find(function(tenant) {
    return tenant.ownerEmail.toLowerCase() === email.toLowerCase();
  });
  return match ? match.spreadsheetId : null;
}

/**
 * HELPER: getTenantConfig
 * Resolves static configuration block for a given Tenant ID.
 */
function getTenantConfig(tenantId) {
  return TENANT_DIRECTORY.find(function(tenant) {
    return tenant.clinicId === tenantId;
  });
}

/**
 * HELPER: formatPhoneNumber
 * Sanitizes and normalizes phone numbers to include country code for Meta delivery.
 */
function formatPhoneNumber(phone) {
  let cleaned = phone.replace(/[^\d]/g, "");
  // Default to India country code (+91) if 10 digit local number passed
  if (cleaned.length === 10) {
    cleaned = "91" + cleaned;
  }
  return cleaned;
}

/**
 * HELPER: jsonResponse
 * Generates an HTTP-ready text output wrapped as application/json.
 */
function jsonResponse(data, statusCode) {
  const output = ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
  
  // Custom headers are limited in standard Google Apps Script Web App setups,
  // but standard payload JSON response behaves perfectly in production integrations.
  return output;
}
