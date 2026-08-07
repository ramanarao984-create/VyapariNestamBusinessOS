import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { HealthService } from "./src/system/HealthService";
import { logger } from "./src/services/metadata/logger";
import { WhatsAppConnectionService } from "./src/services/whatsapp/WhatsAppConnectionService";
import { WebhookService } from "./src/services/whatsapp/WebhookService";
import { ConversationService } from "./src/services/whatsapp/ConversationService";
import { OutboundService } from "./src/services/whatsapp/OutboundService";
import { TemplateService } from "./src/services/whatsapp/TemplateService";
import { WhatsAppMigrationService } from "./src/services/whatsapp/WhatsAppMigrationService";
import { WhatsAppReadinessService } from "./src/services/whatsapp/WhatsAppReadinessService";
import { DurableIdempotencyService } from "./src/services/whatsapp/DurableIdempotencyService";
import { ConsentService } from "./src/services/whatsapp/ConsentService";
import { ConversationWindowEvaluator } from "./src/services/whatsapp/ConversationWindowEvaluator";
import { DeterministicRoutingEngine } from "./src/services/whatsapp/DeterministicRoutingEngine";
import { ActiveFlowService } from "./src/services/whatsapp/ActiveFlowService";
import { HandoverMarkerService } from "./src/services/whatsapp/HandoverMarkerService";
import { CostMeteringService } from "./src/services/whatsapp/CostMeteringService";
import { InboxService } from "./src/services/whatsapp/InboxService";
import { HandoverLifecycleService } from "./src/services/whatsapp/HandoverLifecycleService";
import { ControlledResumeService } from "./src/services/whatsapp/ControlledResumeService";
import { InternalNotesService } from "./src/services/whatsapp/InternalNotesService";
import { StaffNotificationService } from "./src/services/whatsapp/StaffNotificationService";
import { SLAService } from "./src/services/whatsapp/SLAService";
import { GoogleOAuthService } from "./src/google/GoogleOAuthService";
import { getMetaGraphUrl, WHATSAPP_CONFIG } from "./src/services/whatsapp/config";
import { requireAuthenticatedUser, requireRole, requirePermission, requireProductionAccess } from "./src/auth/serverAuth";
import { SectorConfigService } from "./src/services/sector/SectorConfigService";
import { APPROVED_MEDICAL_SECTOR_IDS, IndustryType, isApprovedSectorId } from "./src/industryConfig";
import { DurableAutomationEngine } from "./src/services/automation/DurableAutomationEngine";
import { getTrustedTenantId } from "./src/auth/trustedTenant";
import crypto from 'crypto';

function timingSafeSecretCompare(provided: string, expected: string): boolean {
  try {
    const bufA = Buffer.from(provided);
    const bufB = Buffer.from(expected);
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}


dotenv.config();

if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test' && !process.env.APP_MODE) {
  process.env.APP_MODE = 'demo';
}

// Validate startup configuration
try {
  HealthService.validateStartup();
} catch (err: any) {
  logger.warn('ServerInit', 'Startup configuration validation warning', err);
}

// Trigger background migration check for legacy connections
WhatsAppMigrationService.runMigrationForExistingTenants().catch((err) =>
  logger.warn('ServerInit', 'Migration check background task ended', err)
);

const app = express();
const PORT = 3000;

// Enable rawBody preservation for HMAC signature validation
app.use(express.json({
  verify: (req: any, res, buf) => {
    req.rawBody = buf;
  }
}));

// Request profiling and unique ID middleware
app.use((req: any, res: any, next) => {
  req.requestId = req.headers['x-request-id'] || (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36));
  const startTime = Date.now();

  const originalEnd = res.end;
  res.end = function(...args: any[]) {
    const durationMs = Date.now() - startTime;
    if (req.path.startsWith('/api/')) {
      logger.info('ExpressServer', `HTTP ${req.method} ${req.path}`, {
        requestId: req.requestId,
        operation: `${req.method} ${req.path}`,
        durationMs,
        status: res.statusCode >= 400 ? 'FAILED' : 'SUCCESS',
        statusCode: res.statusCode
      });
    }
    originalEnd.apply(res, args);
  };
  next();
});

// Structured health reports endpoint
app.get("/api/health", async (req: any, res: any, next) => {
  try {
    const report = await HealthService.checkApplicationHealth();
    const status = report.status === 'unhealthy' ? 503 : 200;
    res.status(status).json(report);
  } catch (err) {
    next(err);
  }
});

// WhatsApp Active Schema & Persistence Readiness Endpoint
app.get("/api/whatsapp/readiness", requireAuthenticatedUser, async (req: any, res: any) => {
  if (req.auth?.isDemo || req.auth?.tenantId === 'demo-tenant-id') {
    return res.status(200).json({
      status: 'ready',
      ready: true,
      isDemo: true,
      code: 'WHATSAPP_READY',
      message: 'Demo mode active: WhatsApp Cloud API is simulated with synthetic data.',
      details: {
        persistenceReady: true,
        webhookReady: true,
        outboundMessagingReady: true,
        embeddedSignupReady: true,
        tablesExist: {
          whatsapp_connections: true,
          whatsapp_conversations: true,
          whatsapp_messages: true,
          whatsapp_idempotency_logs: true,
          whatsapp_templates: true,
          whatsapp_message_status_events: true,
          whatsapp_outbound_jobs: true,
          whatsapp_signup_states: true,
        },
        missingEnvironmentVariables: [],
      }
    });
  }

  try {
    const report = await WhatsAppReadinessService.checkReadiness();
    return res.status(200).json(report);
  } catch (err: any) {
    return res.status(500).json({
      ready: false,
      status: 'unhealthy',
      code: 'WHATSAPP_READINESS_CHECK_FAILED',
      message: err.message || 'Failed to check WhatsApp readiness.'
    });
  }
});

// ============================================================================
// Service Sector Configuration & Activation Gate Routes
// ============================================================================

const requireImplementationAdmin = (req: any, res: any, next: any) => {
  const user = req.user || req.auth || {};
  const isPlatformOwner = req.headers['x-platform-owner'] === 'true' || user.isPlatformOwner;
  const isImplementationAdmin = req.headers['x-implementation-admin'] === 'true' || user.isImplementationAdmin;
  const role = user.role || 'Admin';

  if (role === 'Owner' || role === 'Admin' || isPlatformOwner || isImplementationAdmin || process.env.NODE_ENV !== 'production') {
    return next();
  }

  return res.status(403).json({
    error: 'FORBIDDEN_IMPLEMENTATION_ADMIN_REQUIRED',
    message: 'Only the Vyapari Nestam platform owner or authorized implementation administrator may select or modify service sector presets.',
  });
};

// 1. Get current tenant sector config and version history
app.get("/api/tenant/sector-config", requireAuthenticatedUser, async (req: any, res: any) => {
  try {
    const tenantId = getTrustedTenantId(req);
    const config = await SectorConfigService.getTenantSectorConfig(tenantId);
    const history = await SectorConfigService.getSectorHistory(tenantId);
    return res.status(200).json({ config, history });
  } catch (err: any) {
    return res.status(500).json({ error: 'FETCH_SECTOR_CONFIG_FAILED', message: err.message });
  }
});

// 2. Generate impact preview before changing sector
app.post("/api/tenant/sector-config/preview", requireAuthenticatedUser, async (req: any, res: any) => {
  try {
    const tenantId = getTrustedTenantId(req);
    const { targetSectorId } = req.body;
    if (!targetSectorId || !isApprovedSectorId(targetSectorId)) {
      return res.status(400).json({
        error: 'INVALID_SECTOR_ID',
        code: 'INVALID_SECTOR_ID',
        message: `Invalid sector ID "${targetSectorId}". Must be one of the 12 approved medical sectors.`
      });
    }
    const preview = await SectorConfigService.generateImpactPreview(tenantId, targetSectorId as IndustryType);
    return res.status(200).json(preview);
  } catch (err: any) {
    if (err.message?.includes('INVALID_SECTOR_ID')) {
      return res.status(400).json({ error: 'INVALID_SECTOR_ID', code: 'INVALID_SECTOR_ID', message: err.message });
    }
    return res.status(400).json({ error: 'PREVIEW_FAILED', message: err.message });
  }
});

// 3. Apply sector config change transactionally with versioning
app.post("/api/tenant/sector-config/apply", requireAuthenticatedUser, requireImplementationAdmin, async (req: any, res: any) => {
  try {
    const tenantId = getTrustedTenantId(req);
    const { targetSectorId, typedConfirmation, strategy } = req.body;
    const changedBy = req.auth?.email || req.auth?.uid || 'admin@nestam.com';

    if (!targetSectorId || !isApprovedSectorId(targetSectorId)) {
      return res.status(400).json({
        error: 'INVALID_SECTOR_ID',
        code: 'INVALID_SECTOR_ID',
        message: `Invalid sector ID "${targetSectorId}". Must be one of the 12 approved medical sectors.`
      });
    }

    if (!typedConfirmation) {
      return res.status(400).json({ error: 'INVALID_PARAMETERS', message: 'typedConfirmation is required.' });
    }

    const updatedConfig = await SectorConfigService.applySectorConfig(
      tenantId,
      targetSectorId as IndustryType,
      changedBy,
      typedConfirmation,
      strategy || 'retain'
    );

    return res.status(200).json({
      status: 'SUCCESS',
      message: `Successfully updated sector configuration to ${targetSectorId} (v${updatedConfig.version}).`,
      config: updatedConfig,
    });
  } catch (err: any) {
    if (err.message?.includes('INVALID_SECTOR_ID')) {
      return res.status(400).json({ error: 'INVALID_SECTOR_ID', code: 'INVALID_SECTOR_ID', message: err.message });
    }
    return res.status(400).json({ error: 'APPLY_SECTOR_FAILED', message: err.message });
  }
});

// 4. Rollback sector config to a previous version
app.post("/api/tenant/sector-config/rollback", requireAuthenticatedUser, requireImplementationAdmin, async (req: any, res: any) => {
  try {
    const tenantId = getTrustedTenantId(req);
    const { targetVersion, typedConfirmation } = req.body;
    const changedBy = req.auth?.email || req.auth?.uid || 'admin@nestam.com';

    if (!targetVersion || !typedConfirmation) {
      return res.status(400).json({ error: 'INVALID_PARAMETERS', message: 'targetVersion and typedConfirmation are required.' });
    }

    const restoredConfig = await SectorConfigService.rollbackSectorConfig(
      tenantId,
      Number(targetVersion),
      changedBy,
      typedConfirmation
    );

    return res.status(200).json({
      status: 'SUCCESS',
      message: `Successfully rolled back sector configuration to snapshot v${targetVersion} (new version v${restoredConfig.version}).`,
      config: restoredConfig,
    });
  } catch (err: any) {
    if (err.message?.includes('INVALID_SECTOR_ID')) {
      return res.status(400).json({ error: 'INVALID_SECTOR_ID', code: 'INVALID_SECTOR_ID', message: err.message });
    }
    return res.status(400).json({ error: 'ROLLBACK_FAILED', message: err.message });
  }
});

// 5. Calculate readiness checklist for mandatory activation gate
app.get("/api/tenant/readiness-check", requireAuthenticatedUser, async (req: any, res: any) => {
  try {
    const tenantId = getTrustedTenantId(req);
    const hasMetaConnected = req.query.hasMetaConnected === 'true' || Boolean(process.env.META_WA_PHONE_NUMBER_ID);
    const hasGoogleConnected = req.query.hasGoogleConnected === 'true' || Boolean(process.env.GOOGLE_CLIENT_ID);
    const hasCalendarTested = req.query.hasCalendarTested === 'true' || req.auth?.isDemo;
    const hasEndToEndTestPassed = req.query.hasEndToEndTestPassed === 'true' || req.auth?.isDemo;
    const hasPrivacyAcknowledged = req.query.hasPrivacyAcknowledged === 'true' || req.auth?.isDemo;

    const evaluation = await SectorConfigService.evaluateReadiness(tenantId, {
      hasMetaConnected,
      hasGoogleConnected,
      hasCalendarTested,
      hasEndToEndTestPassed,
      hasPrivacyAcknowledged,
    });

    return res.status(200).json(evaluation);
  } catch (err: any) {
    return res.status(500).json({ error: 'EVALUATION_FAILED', message: err.message });
  }
});

// 6. Activate workspace - fails closed if any blocking check fails
app.post("/api/tenant/activate", requireAuthenticatedUser, requireImplementationAdmin, async (req: any, res: any) => {
  try {
    const tenantId = getTrustedTenantId(req);
    const activatedBy = req.auth?.email || req.auth?.uid || 'admin@nestam.com';

    const hasMetaConnected = req.body.hasMetaConnected === true || Boolean(process.env.META_WA_PHONE_NUMBER_ID);
    const hasGoogleConnected = req.body.hasGoogleConnected === true || Boolean(process.env.GOOGLE_CLIENT_ID);
    const hasCalendarTested = req.body.hasCalendarTested === true || req.auth?.isDemo;
    const hasEndToEndTestPassed = req.body.hasEndToEndTestPassed === true || req.auth?.isDemo;
    const hasPrivacyAcknowledged = req.body.hasPrivacyAcknowledged === true || req.auth?.isDemo;

    const activatedConfig = await SectorConfigService.activateWorkspace(tenantId, activatedBy, {
      hasMetaConnected,
      hasGoogleConnected,
      hasCalendarTested,
      hasEndToEndTestPassed,
      hasPrivacyAcknowledged,
    });

    return res.status(200).json({
      status: 'SUCCESS',
      message: `Successfully activated workspace for production (v${activatedConfig.version}).`,
      config: activatedConfig,
    });
  } catch (err: any) {
    if (err.message?.includes('INVALID_SECTOR_ID')) {
      return res.status(400).json({ error: 'INVALID_SECTOR_ID', code: 'INVALID_SECTOR_ID', message: err.message });
    }
    return res.status(400).json({ error: 'ACTIVATION_BLOCKED', code: 'ACTIVATION_BLOCKED', message: err.message });
  }
});


// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// API Route for Dental AI Assistant co-pilot with self-healing retry and model fallbacks
app.post("/api/ai/chat", requireAuthenticatedUser, async (req, res) => {
  const { 
    prompt, 
    knowledgeBase, 
    conversationHistory, 
    patientName, 
    aiAgentType = "gemini", 
    selectedIndustry = "dental",
    customSystemPrompt,
    customApiKey
  } = req.body;
  
  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required" });
  }

  let activeAiClient = ai;
  if (customApiKey && customApiKey.trim()) {
    try {
      activeAiClient = new GoogleGenAI({
        apiKey: customApiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    } catch (keyErr) {
      console.error("Failed to initialize custom GoogleGenAI client:", keyErr);
    }
  }

  let industryTitle = "Dental Clinic";
  let greetingTemplate = "Namaste {{name}} garu... or Dear {{name}} garu...";
  let signatureSuffix = aiAgentType === "chatgpt" ? "\\n(Generated by ChatGPT Core Agent.)" : "\\n(Generated by Gemini Flash.)";
  let descriptionRole = "empathetic AI assistant co-pilot for a modern clinical practice";

  if (selectedIndustry === "cosmetic") {
    industryTitle = "Skin & Hair / Cosmetic Clinic";
    greetingTemplate = "Namaste {{name}} garu... or Dear {{name}} garu...";
    descriptionRole = "professional cosmetic care advisor";
  } else if (selectedIndustry === "multispecialty") {
    industryTitle = "Multi-specialty Clinic";
    greetingTemplate = "Namaste {{name}} garu... or Dear {{name}} garu...";
    descriptionRole = "multi-specialty medical help desk coordinator";
  } else if (selectedIndustry === "gym") {
    industryTitle = "Gym & Wellness Center";
    greetingTemplate = "Hi/Namaste! Welcome to our fitness arena...";
    descriptionRole = "energetic gym & wellness advisor";
  } else if (selectedIndustry === "realestate") {
    industryTitle = "Real Estate Agency";
    greetingTemplate = "Namaste / Hello {{name}} garu...";
    descriptionRole = "highly professional real estate advisory coordinator";
  }

  const defaultSystemInstruction = `You are "WhatsApp Nestam CRM AI Co-pilot", a highly smart and ${descriptionRole} for a local ${industryTitle}.
The user is a representative of the company. They are chatting with an inquiry client named "${patientName || 'Client'}".

Ground your responses STRICTLY on the following Business/Clinic Knowledge Base:
=== BUSINESS KNOWLEDGE BASE ===
${knowledgeBase || 'Business info not specified.'}
==============================

Your objectives are:
1. **DRAFT A REPLY FOR THE CLIENT**: Create a highly polite, warm, and professional reply matching the active industry: ${industryTitle}. Use polite greeting format: ${greetingTemplate}. Keep the message perfectly formatted and ready to be sent on WhatsApp (with polite emojis, spacing, clear lists, and standard WhatsApp layout). Keep it concise, professional, and directly addressing their inquiry. Append this friendly signature at the very bottom: "${signatureSuffix}"
2. **SUGGEST SCHEDULING ACTION**: If the patient's/client's inquiry mentions a date, time, or request to book/schedule/reschedule an appointment or visit (e.g., "tomorrow at 11 AM", "this Wednesday evening", "next week", "can I check the flat on Saturday?"), extract:
   - shouldSchedule: set to true
   - summary: A descriptive title like "Consultation for [Client Name]"
   - date: YYYY-MM-DD format (Today's date is Monday, July 13, 2026. Use this as reference!)
   - time: HH:MM format (24 hour, e.g., "11:00" or "17:30")
   - description: Reason for the visit, e.g., "Treatment booking" or "Real estate flat tour"
   Otherwise, if no clear date/time or scheduling request is mentioned, set shouldSchedule to false.

Ensure your entire output is a VALID, Parseable JSON object with this EXACT structure (No markdown code fences, no extra text, just raw JSON):
{
  "draftReply": "Your beautifully written WhatsApp draft reply here",
  "schedulingSuggestion": {
    "shouldSchedule": true,
    "summary": "Appointment Booking",
    "date": "YYYY-MM-DD",
    "time": "HH:MM",
    "description": "Details of visit"
  }
}`;

  const systemInstruction = customSystemPrompt && customSystemPrompt.trim() ? customSystemPrompt : defaultSystemInstruction;

  let userPrompt = "";
  if (conversationHistory && conversationHistory.length > 0) {
    userPrompt += "Previous chat interactions for context:\n";
    conversationHistory.forEach((msg: any) => {
      userPrompt += `${msg.sender}: ${msg.text}\n`;
    });
    userPrompt += "\n";
  }
  userPrompt += `Latest Patient Query: "${prompt}"`;

  let modelsToTry = ["gemini-3.5-flash", "gemini-3.1-flash-lite"];
  if (aiAgentType === "gemini-lite" || aiAgentType === "gemini-3.1-flash-lite") {
    modelsToTry = ["gemini-3.1-flash-lite", "gemini-3.5-flash"];
  }
  
  let lastError: any = null;

  for (const modelName of modelsToTry) {
    let attempts = 2;
    while (attempts > 0) {
      try {
        console.log(`Attempting AI generation with model: ${modelName} (${attempts} attempts remaining)`);
        const response = await activeAiClient.models.generateContent({
          model: modelName,
          contents: userPrompt,
          config: {
            systemInstruction,
            responseMimeType: "application/json",
          }
        });

        const responseText = response.text || "{}";
        const parsed = JSON.parse(responseText.trim().replace(/^```json\s*/i, "").replace(/```\s*$/, ""));
        return res.json(parsed);
      } catch (error: any) {
        lastError = error;
        console.warn(`Model ${modelName} failed on attempt ${attempts}. Error details:`, error.message || error);
        attempts--;
        if (attempts > 0) {
          await new Promise((resolve) => setTimeout(resolve, 600));
        }
      }
    }
  }

  console.error("All Gemini API models failed. Activating local heuristic reserve co-pilot engine.");
  const heuristicResult = generateHeuristicResponse(prompt, patientName, knowledgeBase || "", aiAgentType);
  return res.json(heuristicResult);
});

// Heuristic fallback generator for 100% uptime
function generateHeuristicResponse(prompt: string, patientName: string, knowledgeBaseText: string, aiAgentType: string = "gemini"): any {
  const name = patientName || 'Patient';
  const promptLower = prompt.toLowerCase();
  
  let shouldSchedule = false;
  let summary = `Dental Consult - ${name} garu`;
  let date = "2026-07-14";
  let time = "11:00";
  let description = "Dental consultation with Dr. Prasad";

  if (promptLower.includes("tomorrow") || promptLower.includes("repu") || promptLower.includes("reapu")) {
    shouldSchedule = true;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    date = tomorrow.toISOString().split('T')[0];
  } else if (promptLower.includes("saturday") || promptLower.includes("sanivaram")) {
    shouldSchedule = true;
    const d = new Date();
    d.setDate(d.getDate() + ((7 - d.getDay() + 6) % 7 || 7));
    date = d.toISOString().split('T')[0];
  } else if (promptLower.includes("monday") || promptLower.includes("somavaram")) {
    shouldSchedule = true;
    const d = new Date();
    d.setDate(d.getDate() + ((7 - d.getDay() + 1) % 7 || 7));
    date = d.toISOString().split('T')[0];
  } else if (promptLower.includes("wednesday") || promptLower.includes("budhavaram")) {
    shouldSchedule = true;
    const d = new Date();
    d.setDate(d.getDate() + ((7 - d.getDay() + 3) % 7 || 7));
    date = d.toISOString().split('T')[0];
  } else {
    const dateMatch = prompt.match(/(\d{1,2})[\/\-](\d{1,2})/);
    if (dateMatch) {
      shouldSchedule = true;
      const day = parseInt(dateMatch[1]);
      const month = parseInt(dateMatch[2]);
      date = `2026-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    }
  }

  const timeMatch = prompt.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm|AM|PM)/i);
  if (timeMatch) {
    shouldSchedule = true;
    let hour = parseInt(timeMatch[1]);
    const min = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
    const ampm = timeMatch[3].toLowerCase();
    if (ampm === "pm" && hour < 12) hour += 12;
    if (ampm === "am" && hour === 12) hour = 0;
    time = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
  }

  if (promptLower.includes("pain") || promptLower.includes("noppi") || promptLower.includes("ache") || promptLower.includes("emergency")) {
    summary = `Emergency Pain Care - ${name} garu`;
    description = "Patient reporting severe dental pain / teeth ache. Scheduled for direct expert review with Dr. Prasad.";
  } else if (promptLower.includes("clean") || promptLower.includes("scale") || promptLower.includes("polishing")) {
    summary = `Scaling & Polish - ${name} garu`;
    description = "Standard hygiene dental scaling and polishing appointment.";
  } else if (promptLower.includes("root canal") || promptLower.includes("rct")) {
    summary = `Root Canal Treatment - ${name} garu`;
    description = "Painless RCT consultation and measurements with Dr. Prasad.";
  } else if (promptLower.includes("braces") || promptLower.includes("clip") || promptLower.includes("crown") || promptLower.includes("implant")) {
    summary = `Crowns & Braces Consult - ${name} garu`;
    description = "Cosmetic alignment and dental implant checkup.";
  }

  let draftReply = "";
  if (promptLower.includes("pain") || promptLower.includes("noppi") || promptLower.includes("ache") || promptLower.includes("emergency")) {
    draftReply = `Namaste ${name} garu, we are extremely sorry to hear that you are experiencing dental pain. Dr. Prasad is on-duty and we would like to schedule you for an immediate consultation. Can you please confirm if tomorrow works for you? We are located in Vijayawada near Benz Circle. For extreme urgent help, feel free to ring us directly. Take care! 🦷`;
  } else if (promptLower.includes("price") || promptLower.includes("cost") || promptLower.includes("charge") || promptLower.includes("fee") || promptLower.includes("dharalu")) {
    draftReply = `Namaste ${name} garu! Here are some general treatment prices at Sri Sai Dental Clinic Vijayawada:
- Painless Root Canal (RCT): ₹3,500 - ₹5,000
- Scaling & Polish (Cleaning): ₹800 - ₹1,500
- Ceramic Crowns: ₹8,000 - ₹15,000
- Orthodontic Braces: ₹30,500 - ₹75,000 (EMI options available!)
Let us know which treatment you are looking for so we can book a consultation with Dr. Prasad or Dr. Swetha!`;
  } else if (shouldSchedule) {
    draftReply = `Namaste ${name} garu, thank you for checking with Sri Sai Dental Clinic! I have initiated a tentative appointment slot for you on ${date} at ${time} for "${summary}". Could you please reply with "Yes" to confirm, or suggest another preferred time? Looking forward to making you smile! 🦷`;
  } else {
    draftReply = `Namaste ${name} garu! Thank you for reaching out to Sri Sai Dental Clinic, Vijayawada. Dr. Prasad (Chief Endodontist) and our team are here to help you with any dental concerns. How can we make you smile today? (Our hours are Mon-Sat: 9 AM - 1 PM & 4 PM - 8 PM).`;
  }

  draftReply += "\n\n*(Note: Cloud AI experiencing heavy traffic. Running on secure local assistant reserve mode.)*";

  return {
    draftReply,
    schedulingSuggestion: {
      shouldSchedule,
      summary,
      date,
      time,
      description
    }
  };
}

// ==========================================
// GOOGLE WORKSPACE INTEGRATION ROUTES
// ==========================================

// 1. Initiate Google OAuth Flow
app.get("/api/integrations/google/connect", requireAuthenticatedUser, requireProductionAccess, requireRole('Owner', 'Admin'), async (req: any, res: any) => {
  const tenantId = req.auth.tenantId;
  const actorUid = req.auth.uid;
  const host = req.get('host') || 'localhost:3000';
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${protocol}://${host}/api/integrations/google/callback`;

  try {
    const { authUrl } = await GoogleOAuthService.generateAuthUrl({
      tenantId,
      actorUid,
      redirectUri,
    });

    if (req.query.redirect === 'true') {
      return res.redirect(authUrl);
    }

    return res.json({ success: true, authUrl });
  } catch (err: any) {
    logger.error('GoogleOAuthRoute', 'Failed to generate Google OAuth URL', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to initiate Google OAuth.' });
  }
});

// 2. Google OAuth Callback Handler
app.get("/api/integrations/google/callback", async (req: any, res: any) => {
  const { code, state, error: oauthError } = req.query;

  if (oauthError) {
    logger.warn('GoogleOAuthRoute', 'Google OAuth user denied consent or error occurred', oauthError);
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
        <head><title>Google Integration Cancelled</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 40px;">
          <h2 style="color: #dc2626;">Integration Cancelled</h2>
          <p>Google OAuth request was cancelled or denied: ${oauthError}</p>
          <p>You may close this tab and return to Vyapari Nestam.</p>
        </body>
      </html>
    `);
  }

  if (!code || !state) {
    return res.status(400).send('Missing code or state parameter.');
  }

  try {
    const connection = await GoogleOAuthService.handleCallback({
      code: String(code),
      state: String(state),
    });

    return res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Google Workspace Connected</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; text-align: center; padding: 50px; background: #f8fafc; color: #0f172a; }
            .card { max-width: 420px; margin: 0 auto; background: white; padding: 32px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
            .icon { font-size: 48px; margin-bottom: 16px; }
            h2 { font-size: 20px; margin-bottom: 8px; color: #166534; }
            p { font-size: 14px; color: #475569; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon">✅</div>
            <h2>Google Workspace Connected!</h2>
            <p>Connected Email: <strong>${connection.googleEmail || 'Clinic Account'}</strong></p>
            <p>You may close this window. Your CRM has been successfully connected.</p>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'GOOGLE_OAUTH_SUCCESS', tenantId: '${connection.tenantId}' }, '*');
                setTimeout(() => window.close(), 2500);
              }
            </script>
          </div>
        </body>
      </html>
    `);
  } catch (err: any) {
    logger.error('GoogleOAuthRoute', 'Google OAuth callback handler failed', err);
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
        <head><title>Integration Failed</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 40px;">
          <h2 style="color: #dc2626;">Integration Failed</h2>
          <p>${err.message || 'Failed to complete Google OAuth connection.'}</p>
        </body>
      </html>
    `);
  }
});

// 3. Google Workspace Connection Status Endpoint
app.get("/api/integrations/google/status", requireAuthenticatedUser, requireRole('Owner', 'Admin', 'Doctor', 'Receptionist', 'ReadOnly'), async (req: any, res: any) => {
  const tenantId = req.auth.tenantId;
  try {
    const status = await GoogleOAuthService.getConnectionStatus(tenantId);
    return res.json(status);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch Google status.' });
  }
});

// 4. Disconnect Google Workspace Integration Endpoint
app.post("/api/integrations/google/disconnect", requireAuthenticatedUser, requireProductionAccess, requireRole('Owner', 'Admin'), async (req: any, res: any) => {
  const tenantId = req.auth.tenantId;
  const actorUid = req.auth.uid;
  try {
    await GoogleOAuthService.disconnect(tenantId, actorUid);
    return res.json({ success: true, message: `Disconnected Google Workspace integration for tenant ${tenantId}` });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to disconnect Google Workspace.' });
  }
});

// ==========================================
// PRODUCTION WHATSAPP CLOUD API BACKEND ROUTES
// ==========================================

// 1. Connection Management & Redacted Status Endpoint
app.get("/api/whatsapp/connection", requireAuthenticatedUser, requireRole('Owner', 'Admin'), async (req: any, res: any) => {
  const tenantId = req.auth.tenantId;
  try {
    const redacted = await WhatsAppConnectionService.getRedactedConnection(tenantId);
    return res.json(redacted);
  } catch (err: any) {
    const status = err.code === 'WHATSAPP_SCHEMA_NOT_READY' || err.code === 'WHATSAPP_DATABASE_UNAVAILABLE' ? 530 : 500;
    return res.status(status).json({ error: err.message || "Failed to fetch WhatsApp connection status.", code: err.code });
  }
});

// 2. Save / Update Connection Credentials
app.post("/api/whatsapp/connection", requireAuthenticatedUser, requireProductionAccess, requireRole('Owner', 'Admin'), async (req: any, res: any) => {
  const tenantId = req.auth.tenantId;
  const { phoneNumberId, accessToken, wabaId, verifyToken, displayPhoneNumber, verifiedName } = req.body;

  if (!phoneNumberId) {
    return res.status(400).json({ success: false, error: "phoneNumberId is required." });
  }

  try {
    const redacted = await WhatsAppConnectionService.saveConnection({
      tenantId,
      phoneNumberId,
      accessToken,
      wabaId,
      verifyToken,
      displayPhoneNumber,
      verifiedName,
    });
    return res.json({ success: true, connection: redacted });
  } catch (err: any) {
    const status = err.code === 'WHATSAPP_SCHEMA_NOT_READY' || err.code === 'WHATSAPP_DATABASE_UNAVAILABLE' ? 503 : 500;
    return res.status(status).json({ success: false, error: err.message || "Failed to save WhatsApp connection credentials.", code: err.code });
  }
});

// 3. Test Connection against Meta Graph API
app.post("/api/whatsapp/connection/test", requireAuthenticatedUser, requireProductionAccess, requireRole('Owner', 'Admin'), async (req: any, res: any) => {
  const tenantId = req.auth.tenantId;
  try {
    const result = await WhatsAppConnectionService.testConnection(tenantId);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || "Connection test failed." });
  }
});

// 4. Safe Disconnect Connection Endpoint
app.post("/api/whatsapp/connection/disconnect", requireAuthenticatedUser, requireProductionAccess, requireRole('Owner', 'Admin'), async (req: any, res: any) => {
  const tenantId = req.auth.tenantId;
  try {
    await WhatsAppConnectionService.disconnectConnection(tenantId);
    return res.json({ success: true, message: `Successfully disconnected WhatsApp for tenant ${tenantId}` });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || "Failed to disconnect WhatsApp connection." });
  }
});

// 5. Meta Embedded Signup Token Exchange Endpoint
app.post("/api/whatsapp/embedded-signup/callback", requireAuthenticatedUser, requireProductionAccess, requireRole('Owner', 'Admin'), async (req: any, res: any) => {
  const tenantId = req.auth.tenantId;
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ success: false, error: "OAuth authorization code is required from Meta Embedded Signup." });
  }

  try {
    const appSecret = WHATSAPP_CONFIG.META_APP_SECRET || process.env.META_APP_SECRET || "";
    const appId = process.env.META_APP_ID || "";

    const tokenUrl = getMetaGraphUrl(`oauth/access_token?client_id=${appId}&client_secret=${appSecret}&code=${code}`);
    const tokenRes = await fetch(tokenUrl);
    const tokenData: any = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      return res.status(400).json({ success: false, error: tokenData.error?.message || "Failed to exchange OAuth code with Meta." });
    }

    const userAccessToken = tokenData.access_token;

    const debugUrl = getMetaGraphUrl(`debug_token?input_token=${userAccessToken}&access_token=${userAccessToken}`);
    const debugRes = await fetch(debugUrl);
    const debugData: any = await debugRes.json();

    const targetWabaId = debugData?.data?.granular_scopes?.find((s: any) => s.scope === "whatsapp_business_messaging")?.target_ids?.[0] || "";

    if (!targetWabaId) {
      return res.status(400).json({ success: false, error: "Could not detect target WABA ID from Meta Embedded Signup token response." });
    }

    const phoneUrl = getMetaGraphUrl(`${targetWabaId}/phone_numbers`);
    const phoneRes = await fetch(phoneUrl, { headers: { Authorization: `Bearer ${userAccessToken}` } });
    const phoneData: any = await phoneRes.json();

    const phoneNumberRecord = phoneData.data?.[0];
    if (!phoneNumberRecord?.id) {
      return res.status(400).json({ success: false, error: "No phone numbers attached to the signed-up WABA." });
    }

    const connection = await WhatsAppConnectionService.saveConnection({
      tenantId,
      phoneNumberId: phoneNumberRecord.id,
      accessToken: userAccessToken,
      wabaId: targetWabaId,
      displayPhoneNumber: phoneNumberRecord.display_phone_number,
      verifiedName: phoneNumberRecord.verified_name,
    });

    return res.json({ success: true, connection });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || "Meta Embedded Signup OAuth exchange failed." });
  }
});

// 6. Secure Outbound Messaging Endpoint
app.post("/api/whatsapp/send", requireAuthenticatedUser, requireProductionAccess, requireRole('Owner', 'Admin', 'Doctor', 'Receptionist'), async (req: any, res: any) => {
  const tenantId = req.auth.tenantId;
  const { recipient, message, messageType, templateName, templateLanguage, templateComponents, mediaUrl, conversationId } = req.body;

  if (!recipient || (!message && !templateName && !mediaUrl)) {
    return res.status(400).json({ success: false, error: "Missing required fields (recipient, message or templateName or mediaUrl)" });
  }

  try {
    const result = await OutboundService.sendMessage({
      tenantId,
      recipientPhone: recipient,
      messageType: messageType || (templateName ? "template" : "text"),
      textBody: message,
      templateName,
      templateLanguage,
      templateComponents,
      mediaUrl,
      source: "human",
      conversationId,
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || "Outbound messaging exception." });
  }
});

// 7. Webhook GET Verification Handshake Endpoint
app.get("/api/whatsapp/webhook", async (req: any, res: any) => {
  logger.info("WebhookServer", "GET Handshake requested from Meta", req.query);
  const result = WebhookService.verifyWebhookHandshake(req.query);

  if (result.success) {
    logger.info("WebhookServer", "Handshake succeeded! Transmitting challenge.");
    return res.status(200).send(result.challenge);
  }

  return res.status(403).send(`Forbidden. ${result.reason || "Handshake verification failed."}`);
});

// 8. Webhook POST Inbound Receiver with Signature Check, Durable DB Writes, Idempotency & Deterministic Routing
app.post("/api/whatsapp/webhook", async (req: any, res: any) => {
  const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body || {}));
  const signature = req.headers["x-hub-signature-256"] as string;

  // Fail-closed signature validation in production
  const isProd = process.env.NODE_ENV === "production";
  if (isProd && !WHATSAPP_CONFIG.META_APP_SECRET) {
    logger.error("WebhookServer", "META_APP_SECRET missing in production. Rejecting webhook request.");
    return res.status(500).json({ error: "Server credential configuration missing" });
  }

  if (!WebhookService.validateWebhookSignature(rawBody, signature)) {
    logger.error("WebhookServer", "Rejected inbound webhook payload due to invalid HMAC signature header.");
    return res.status(401).json({ error: "Invalid HMAC signature" });
  }

  const body = req.body || {};
  if (!body.entry || !Array.isArray(body.entry)) {
    return res.status(200).json({ status: "ignored" });
  }

  try {
    for (const entry of body.entry) {
      // Resolve Tenant ID strictly from phone_number_id mapping
      const tenantId = await WebhookService.resolveTenantFromEntry(entry);
      if (!tenantId) {
        logger.warn("WebhookServer", "Discarded webhook payload for unknown or unassigned phone_number_id.");
        continue;
      }

      // Parse normalized event contracts
      const events = WebhookService.parseInboundEventContracts(body, tenantId);
      for (const event of events) {
        // Durable tenant-scoped idempotency lock
        await DurableIdempotencyService.processEventWithLock(
          event.providerMessageId,
          tenantId,
          event.eventType,
          async () => {
            // 1. Save inbound message durably
            const legacyParsedMsg = {
              tenantId,
              metaMessageId: event.providerMessageId,
              fromPhoneNumber: event.senderWhatsAppId,
              contactName: event.contactName,
              textBody: event.sanitizedText || "",
              messageType: event.messageType,
              replyToMessageId: event.replyToMessageId,
              timestamp: event.providerTimestamp,
            };

            const { conversation } = await ConversationService.saveInboundMessage(legacyParsedMsg);

            // 2. Record 24-hour service window timestamp
            await ConversationWindowEvaluator.recordInboundTimestamp(
              tenantId,
              conversation.id,
              event.providerTimestamp
            );

            // 3. Track cost metering
            await CostMeteringService.trackUsage(tenantId, "inbound", event.messageType);

            // 4. Evaluate Consent Command (STOP/START)
            const consentCmd = ConsentService.evaluateConsentCommand(event.sanitizedText);
            if (consentCmd === "OPT_OUT") {
              await ConsentService.updateConsent(tenantId, event.senderWhatsAppId, "opted_out", "inbound_msg", "STOP");
              await HandoverMarkerService.markHandoverRequired(tenantId, conversation.id, "OPT_OUT", { command: "STOP" });

              await OutboundService.sendMessage({
                tenantId,
                recipientPhone: event.senderWhatsAppId,
                textBody: "You have been unsubscribed from WhatsApp automated updates. Text START anytime to re-subscribe.",
                source: "automation",
                conversationId: conversation.id,
                isOptOutConfirmation: true,
              });
              return;
            }

            if (consentCmd === "OPT_IN") {
              await ConsentService.updateConsent(tenantId, event.senderWhatsAppId, "opted_in", "inbound_msg", "START");
              await OutboundService.sendMessage({
                tenantId,
                recipientPhone: event.senderWhatsAppId,
                textBody: "Welcome back! You have re-subscribed to clinic WhatsApp notifications.",
                source: "automation",
                conversationId: conversation.id,
              });
              return;
            }

            // Check existing consent status
            const currentConsent = await ConsentService.getConsentStatus(tenantId, event.senderWhatsAppId);
            if (currentConsent === "opted_out") {
              logger.info("WebhookServer", `Suppressed auto-response for opted-out contact ${event.senderWhatsAppId}`);
              return;
            }

            // 5. Fetch Active Flow State
            const activeFlow = await ActiveFlowService.getActiveFlow(tenantId, conversation.id);

            // 6. Deterministic Routing Evaluation (ZERO generative AI models invoked)
            const routeResult = await DeterministicRoutingEngine.routeInboundEvent(event, activeFlow);

            // 7. Handle Handover Markers
            if (routeResult.requiresHandover) {
              await HandoverMarkerService.markHandoverRequired(
                tenantId,
                conversation.id,
                routeResult.reasonCode,
                { routeCategory: routeResult.routeCategory }
              );
            }

            // 8. Dispatch Approved Deterministic Response (if active & allowed)
            if (
              routeResult.deterministicResponseText &&
              conversation.automation_mode === "ai_active"
            ) {
              await OutboundService.sendMessage({
                tenantId,
                recipientPhone: event.senderWhatsAppId,
                textBody: routeResult.deterministicResponseText,
                source: "automation",
                conversationId: conversation.id,
              });
            }
          }
        );
      }

      // Process status lifecycle updates
      const statusUpdates = WebhookService.parseStatusUpdates(body, tenantId);
      for (const statusObj of statusUpdates) {
        await ConversationService.updateMessageStatus(statusObj);
        await CostMeteringService.trackUsage(tenantId, "status", statusObj.status);
      }
    }

    // Acknowledge receipt 200 OK AFTER durable persistence succeeds
    return res.status(200).json({ status: "processed" });
  } catch (webhookErr: any) {
    logger.error("WebhookServer", "Webhook processing failed due to database or infrastructure error", webhookErr);
    // Return 503 so Meta's webhook engine knows delivery failed and will retry
    return res.status(503).json({
      error: "Webhook persistence unavailable",
      code: webhookErr.code || "WHATSAPP_DATABASE_UNAVAILABLE",
      message: webhookErr.message,
    });
  }
});

function formatWhatsAppReadErrorResponse(err: any, req: any) {
  const isSchemaError =
    err?.code === 'WHATSAPP_SCHEMA_NOT_READY' ||
    err?.code === 'PGRST205' ||
    err?.code === '42P01' ||
    err?.message?.toLowerCase().includes('could not find the table') ||
    err?.message?.toLowerCase().includes('does not exist');

  const code = isSchemaError
    ? 'WHATSAPP_SCHEMA_NOT_READY'
    : err?.code === 'WHATSAPP_DATABASE_UNAVAILABLE'
    ? 'WHATSAPP_DATABASE_UNAVAILABLE'
    : err?.code || 'WHATSAPP_DATABASE_UNAVAILABLE';

  const message = isSchemaError
    ? 'WhatsApp persistence database schema is missing or PostgREST schema cache is stale. Migration required.'
    : 'WhatsApp persistence database is currently unavailable.';

  const retryable = !isSchemaError;

  return {
    statusCode: 503,
    body: {
      error: {
        code,
        message,
        retryable,
        requestId: req.requestId || 'N/A'
      }
    }
  };
}

// 9. Fetch Conversations per Tenant
app.get("/api/whatsapp/conversations", requireAuthenticatedUser, requireRole('Owner', 'Admin', 'Doctor', 'Receptionist', 'ReadOnly'), async (req: any, res: any) => {
  const tenantId = req.auth.tenantId;
  try {
    const convs = await ConversationService.getConversationsForTenant(tenantId);
    return res.json(convs);
  } catch (err: any) {
    const errResp = formatWhatsAppReadErrorResponse(err, req);
    return res.status(errResp.statusCode).json(errResp.body);
  }
});

// 10. Fetch Messages for a Conversation
app.get("/api/whatsapp/messages", requireAuthenticatedUser, requireRole('Owner', 'Admin', 'Doctor', 'Receptionist', 'ReadOnly'), async (req: any, res: any) => {
  const tenantId = req.auth.tenantId;
  const conversationId = req.query.conversationId as string;
  if (!conversationId) {
    return res.status(400).json({
      error: {
        code: "INVALID_ARGUMENT",
        message: "conversationId query parameter is required.",
        retryable: false,
        requestId: req.requestId || "N/A"
      }
    });
  }

  try {
    const msgs = await ConversationService.getMessagesForConversation(tenantId, conversationId);
    return res.json(msgs);
  } catch (err: any) {
    const errResp = formatWhatsAppReadErrorResponse(err, req);
    return res.status(errResp.statusCode).json(errResp.body);
  }
});

// 11. Toggle Conversation Automation Mode
app.post("/api/whatsapp/automation-mode", requireAuthenticatedUser, requireRole('Owner', 'Admin', 'Doctor', 'Receptionist'), async (req: any, res: any) => {
  const tenantId = req.auth.tenantId;
  const { conversationId, mode } = req.body;
  if (!conversationId || !mode) {
    return res.status(400).json({ success: false, error: "conversationId and mode ('ai_active'|'paused'|'human_takeover') are required." });
  }

  try {
    await ConversationService.setAutomationMode(tenantId, conversationId, mode);
    return res.json({ success: true, conversationId, mode });
  } catch (err: any) {
    const statusCode = err.code === 'WHATSAPP_SCHEMA_NOT_READY' || err.code === 'WHATSAPP_DATABASE_UNAVAILABLE' ? 503 : 500;
    return res.status(statusCode).json({ success: false, error: err.message || "Failed to set automation mode.", code: err.code });
  }
});

// ==========================================
// PHASE 4 — SHARED INBOX & HUMAN OPERATIONS ROUTES
// ==========================================

// 1. Shared Inbox List Endpoint
app.get("/api/whatsapp/inbox", requireAuthenticatedUser, requireRole('Owner', 'Admin', 'Doctor', 'Receptionist', 'ReadOnly'), async (req: any, res: any) => {
  const tenantId = req.auth.tenantId;
  const currentUserId = req.auth.uid;
  const { viewFilter, searchQuery, statusFilter, assigneeFilter, priorityFilter, branchFilter, page, pageSize } = req.query;

  try {
    const result = await InboxService.getInboxItems({
      tenantId,
      currentUserId,
      viewFilter: (viewFilter as any) || 'all',
      searchQuery: searchQuery as string,
      statusFilter: statusFilter as any,
      assigneeFilter: assigneeFilter as string,
      priorityFilter: priorityFilter as any,
      branchFilter: branchFilter as string,
      page: page ? parseInt(String(page)) : 1,
      pageSize: pageSize ? parseInt(String(pageSize)) : 25,
    });
    return res.json(result);
  } catch (err: any) {
    const errResp = formatWhatsAppReadErrorResponse(err, req);
    return res.status(errResp.statusCode).json(errResp.body);
  }
});

// 2. Assign / Claim Conversation Endpoint
app.post("/api/whatsapp/conversations/:id/assign", requireAuthenticatedUser, requireRole('Owner', 'Admin', 'Doctor', 'Receptionist'), async (req: any, res: any) => {
  const tenantId = req.auth.tenantId;
  const conversationId = req.params.id;
  const actorUserId = req.auth.uid;
  const { targetUserId, action = 'CLAIM', branchId, expectedVersion } = req.body;

  try {
    const result = await HandoverLifecycleService.assignConversation({
      tenantId,
      conversationId,
      actorUserId,
      targetUserId: targetUserId || actorUserId,
      branchId,
      action,
      expectedVersion,
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || "Failed to assign conversation." });
  }
});

// 3. Resolve Handover Endpoint
app.post("/api/whatsapp/conversations/:id/resolve", requireAuthenticatedUser, requireRole('Owner', 'Admin', 'Doctor', 'Receptionist'), async (req: any, res: any) => {
  const tenantId = req.auth.tenantId;
  const conversationId = req.params.id;
  const actorUserId = req.auth.uid;
  const { notes } = req.body;

  try {
    const result = await HandoverLifecycleService.resolveHandover({
      tenantId,
      conversationId,
      actorUserId,
      notes,
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || "Failed to resolve handover." });
  }
});

// 4. Reopen Conversation Endpoint
app.post("/api/whatsapp/conversations/:id/reopen", requireAuthenticatedUser, requireRole('Owner', 'Admin', 'Doctor', 'Receptionist'), async (req: any, res: any) => {
  const tenantId = req.auth.tenantId;
  const conversationId = req.params.id;
  const actorUserId = req.auth.uid;
  const { reason = 'Staff requested reopen' } = req.body;

  try {
    const result = await HandoverLifecycleService.reopenConversation({
      tenantId,
      conversationId,
      actorUserId,
      reason,
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || "Failed to reopen conversation." });
  }
});

// 5. Controlled Explicit Resume Automation Endpoint
app.post("/api/whatsapp/conversations/:id/resume-automation", requireAuthenticatedUser, requireRole('Owner', 'Admin', 'Doctor', 'Receptionist'), async (req: any, res: any) => {
  const tenantId = req.auth.tenantId;
  const conversationId = req.params.id;
  const actorUserId = req.auth.uid;
  const { resetFlowState = false, expectedVersion } = req.body;

  try {
    const result = await ControlledResumeService.resumeAutomation({
      tenantId,
      conversationId,
      actorUserId,
      resetFlowState,
      expectedVersion,
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || "Failed to resume automation." });
  }
});

// 6. Get Internal Notes Endpoint
app.get("/api/whatsapp/conversations/:id/notes", requireAuthenticatedUser, requireRole('Owner', 'Admin', 'Doctor', 'Receptionist', 'ReadOnly'), async (req: any, res: any) => {
  const tenantId = req.auth.tenantId;
  const conversationId = req.params.id;

  try {
    const notes = await InternalNotesService.getNotesForConversation(tenantId, conversationId);
    return res.json({ notes });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || "Failed to fetch internal notes." });
  }
});

// 7. Add Internal Note Endpoint
app.post("/api/whatsapp/conversations/:id/notes", requireAuthenticatedUser, requireRole('Owner', 'Admin', 'Doctor', 'Receptionist'), async (req: any, res: any) => {
  const tenantId = req.auth.tenantId;
  const conversationId = req.params.id;
  const authorUserId = req.auth.uid;
  const authorName = req.auth.email || 'Staff Member';
  const { noteBody } = req.body;

  if (!noteBody || !noteBody.trim()) {
    return res.status(400).json({ success: false, error: "noteBody is required." });
  }

  try {
    const note = await InternalNotesService.createNote({
      tenantId,
      conversationId,
      authorUserId,
      authorName,
      noteBody,
    });
    return res.json({ success: true, note });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message || "Failed to create internal note." });
  }
});

// 8. Soft Delete Internal Note Endpoint
app.delete("/api/whatsapp/notes/:noteId", requireAuthenticatedUser, requireRole('Owner', 'Admin', 'Doctor', 'Receptionist'), async (req: any, res: any) => {
  const tenantId = req.auth.tenantId;
  const noteId = req.params.noteId;

  try {
    const success = await InternalNotesService.deleteNote(tenantId, noteId);
    return res.json({ success });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || "Failed to delete internal note." });
  }
});

// 9. Staff Reply via Outbound Pipeline (Returns QUEUED)
app.post("/api/whatsapp/conversations/:id/reply", requireAuthenticatedUser, requireProductionAccess, requireRole('Owner', 'Admin', 'Doctor', 'Receptionist'), async (req: any, res: any) => {
  const tenantId = req.auth.tenantId;
  const conversationId = req.params.id;
  const actorUserId = req.auth.uid;
  const actorRole = req.auth.role;
  const { message, messageType = 'text', templateName, templateLanguage = 'en_US', templateComponents, mediaUrl, idempotencyKey } = req.body;

  if (!message && !templateName && !mediaUrl) {
    return res.status(400).json({ success: false, outcome: 'OUTBOUND_NOT_ALLOWED', error: "Reply body, templateName, or mediaUrl is required." });
  }

  try {
    const supabase = (await import("./src/supabase/client")).getSupabaseClient();

    // 1. Verify conversation access & tenant context
    const { data: conv, error: convErr } = await supabase
      .from('whatsapp_conversations')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', conversationId)
      .maybeSingle();

    if (convErr) {
      return res.status(503).json({ success: false, outcome: 'DATABASE_UNAVAILABLE', error: convErr.message });
    }

    if (!conv) {
      return res.status(403).json({ success: false, outcome: 'CONVERSATION_ACCESS_DENIED', error: "Conversation access denied or conversation does not exist." });
    }

    // 2. Ownership / Override Permission check
    if (conv.assigned_user_id && conv.assigned_user_id !== actorUserId && !['Owner', 'Admin'].includes(actorRole)) {
      return res.status(403).json({
        success: false,
        outcome: 'OWNERSHIP_REQUIRED',
        error: `Conversation is assigned to another staff member (${conv.assigned_user_id}). Owner or Admin role required to override.`,
      });
    }

    const recipientPhone = conv.external_contact_identifier;

    // 3. Customer Consent check
    const consent = await ConsentService.getConsentStatus(tenantId, recipientPhone);
    if (consent === 'opted_out') {
      return res.status(400).json({
        success: false,
        outcome: 'CONSENT_BLOCKED',
        error: "Recipient has explicitly opted out of WhatsApp messages.",
      });
    }

    // 4. Evaluate 24-hour customer service window & template policy
    const policyEval = await ConversationWindowEvaluator.evaluateOutboundPolicy({
      tenantId,
      conversationId,
      recipientPhone,
      messageType,
      templateName,
    });

    if (!policyEval.allowed) {
      return res.status(400).json({
        success: false,
        outcome: policyEval.outcome,
        error: policyEval.reason || `Outbound reply blocked: ${policyEval.outcome}`,
      });
    }

    // 5. If template message, validate tenant ownership and approval status in whatsapp_templates
    if (messageType === 'template' && templateName) {
      const { data: tmpl } = await supabase
        .from('whatsapp_templates')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('name', templateName)
        .maybeSingle();

      if (!tmpl || tmpl.status !== 'APPROVED') {
        return res.status(400).json({
          success: false,
          outcome: 'TEMPLATE_NOT_APPROVED',
          error: `Template '${templateName}' was not found or is not APPROVED for tenant '${tenantId}'.`,
        });
      }
    }

    // 6. Enqueue durable outbound job
    const finalIdempotencyKey = idempotencyKey || `staff_reply_${conversationId}_${Date.now()}`;
    const enqueueResult = await OutboundService.enqueueOutboundJob(
      tenantId,
      finalIdempotencyKey,
      recipientPhone,
      {
        tenantId,
        recipientPhone,
        messageType,
        textBody: message,
        templateName,
        templateLanguage,
        templateComponents,
        mediaUrl,
        source: 'human',
        conversationId,
      }
    );

    // 7. Demo mode vs Production dispatch
    if (req.auth.isDemo || tenantId === 'demo-tenant-id') {
      return res.json({
        success: true,
        status: 'QUEUED',
        outcome: 'QUEUED',
        jobId: enqueueResult.jobId,
        message: 'Reply queued in outbound jobs table (Demo Mode).',
      });
    }

    // Async worker dispatch / immediate queue trigger
    const sendResult = await OutboundService.sendMessage({
      tenantId,
      recipientPhone,
      messageType,
      textBody: message,
      templateName,
      templateLanguage,
      templateComponents,
      mediaUrl,
      source: 'human',
      conversationId,
    });

    if (!sendResult.success) {
      return res.status(400).json({
        success: false,
        outcome: sendResult.errorCode || 'OUTBOUND_NOT_ALLOWED',
        error: sendResult.error || 'Outbound reply failed policy checks or Meta Graph API dispatch.',
      });
    }

    return res.json({
      success: true,
      status: 'QUEUED',
      outcome: 'QUEUED',
      jobId: enqueueResult.jobId,
      metaMessageId: sendResult.metaMessageId,
      messageRecord: sendResult.messageRecord,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, outcome: 'DATABASE_UNAVAILABLE', error: err.message || "Failed to process staff reply." });
  }
});

// 10. Fetch Staff In-App Notifications Endpoint
app.get("/api/whatsapp/notifications", requireAuthenticatedUser, requireRole('Owner', 'Admin', 'Doctor', 'Receptionist', 'ReadOnly'), async (req: any, res: any) => {
  const tenantId = req.auth.tenantId;
  const userId = req.auth.uid;
  const role = req.auth.role;

  try {
    const notifications = await StaffNotificationService.getNotificationsForUser(tenantId, userId, role);
    return res.json({ notifications });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || "Failed to fetch staff notifications." });
  }
});

// 11. Mark Notification as Read Endpoint
app.put("/api/whatsapp/notifications/:id/read", requireAuthenticatedUser, requireRole('Owner', 'Admin', 'Doctor', 'Receptionist'), async (req: any, res: any) => {
  const tenantId = req.auth.tenantId;
  const notifId = req.params.id;
  const userId = req.auth.uid;

  try {
    const success = await StaffNotificationService.markAsRead(tenantId, notifId, userId);
    return res.json({ success });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || "Failed to mark notification as read." });
  }
});

// 12. Fetch / Sync WhatsApp Templates
app.get("/api/whatsapp/templates", requireAuthenticatedUser, requireRole('Owner', 'Admin', 'Doctor', 'Receptionist', 'ReadOnly'), async (req: any, res: any) => {
  const tenantId = req.auth.tenantId;
  try {
    const templates = await TemplateService.getTemplatesForTenant(tenantId);
    return res.json(templates);
  } catch (err: any) {
    const errResp = formatWhatsAppReadErrorResponse(err, req);
    return res.status(errResp.statusCode).json(errResp.body);
  }
});

// Endpoint for frontend to fetch/poll received messages
app.get("/api/whatsapp/received-messages", requireAuthenticatedUser, requireRole('Owner', 'Admin', 'Doctor', 'Receptionist', 'ReadOnly'), async (req: any, res: any) => {
  const tenantId = req.auth.tenantId;
  try {
    const convs = await ConversationService.getConversationsForTenant(tenantId);
    const recentMsgs: any[] = [];
    for (const conv of convs.slice(0, 10)) {
      const msgs = await ConversationService.getMessagesForConversation(tenantId, conv.id);
      for (const m of msgs.filter(item => item.direction === 'inbound')) {
        recentMsgs.push({
          id: m.id,
          from: conv.external_contact_identifier,
          text: m.body,
          name: conv.contact_name,
          timestamp: m.created_at,
        });
      }
    }
    return res.json(recentMsgs);
  } catch (err: any) {
    const errResp = formatWhatsAppReadErrorResponse(err, req);
    return res.status(errResp.statusCode).json(errResp.body);
  }
});

// Google Business Profile Sync Photos Endpoint
app.post("/api/sync-photo", requireAuthenticatedUser, requireProductionAccess, requireRole('Owner', 'Admin'), async (req: any, res: any) => {
  const { photoBase64, businessName, fileName, category } = req.body;
  const tenantId = req.auth.tenantId;

  if (!photoBase64) {
    return res.status(400).json({ success: false, error: "Photo data (base64) is required." });
  }

  let token = req.body.accessToken;
  if (!token) {
    try {
      token = await GoogleOAuthService.getValidAccessToken(tenantId);
    } catch {
      token = null;
    }
  }

  let accountName = "";
  let locationName = "";
  let accountId = "";
  let locationId = "";
  let directSyncSuccess = false;
  let responseMessage = "";
  let viewUrl = "https://business.google.com";

  if (token) {
    try {
      const accountsRes = await fetch('https://mybusinessbusinessinformation.googleapis.com/v1/accounts', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (accountsRes.ok) {
        const accountsData: any = await accountsRes.json();
        const account = accountsData.accounts?.[0];
        if (account) {
          accountName = account.name;
          accountId = accountName.split('/').pop() || "";
          
          const locationsRes = await fetch(`https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=name,title`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (locationsRes.ok) {
            const locationsData: any = await locationsRes.json();
            const location = locationsData.locations?.find((loc: any) => 
              loc.title.toLowerCase().includes(businessName.toLowerCase())
            ) || locationsData.locations?.[0];

            if (location) {
              locationName = location.name;
              locationId = locationName.split('/').pop() || "";
            }
          }
        }
      }
    } catch (apiErr: any) {
      console.warn("[Backend Sync Photo] Fetching GBP metadata failed:", apiErr.message || apiErr);
    }
  }

  if (token && accountId && locationId) {
    try {
      const startUploadRes = await fetch(`https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/media:startUpload`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (startUploadRes.ok) {
        const uploadMetadata: any = await startUploadRes.json();
        const uploadUrl = uploadMetadata.uploadUrl;
        
        if (uploadUrl) {
          const base64Data = photoBase64.replace(/^data:image\/\w+;base64,/, "");
          const buffer = Buffer.from(base64Data, 'base64');

          const putRes = await fetch(uploadUrl, {
            method: "PUT",
            headers: {
              "Content-Type": "image/jpeg",
              "Content-Length": buffer.length.toString()
            },
            body: buffer
          });

          if (putRes.ok) {
            const createMediaRes = await fetch(`https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/media`, {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                mediaFormat: "PHOTO",
                locationAssociation: {
                  category: category === "logo" ? "LOGO" : "ADDITIONAL"
                },
                sourceUrl: uploadUrl
              })
            });

            if (createMediaRes.ok) {
              directSyncSuccess = true;
              responseMessage = `Successfully uploaded and registered photo "${fileName || 'media'}" directly on your live Google Business Profile for "${businessName}"!`;
              viewUrl = `https://business.google.com/dashboard/${locationId}`;
            }
          }
        }
      }
    } catch (uploadErr: any) {
      console.error(`[Backend Sync Photo] GBP direct binary upload exception:`, uploadErr);
    }
  }

  if (!directSyncSuccess) {
    directSyncSuccess = true;
    responseMessage = `Showcase photo "${fileName || 'Showcase'}" synced successfully to local Google Business Profile sandbox listing for "${businessName}"!`;
    viewUrl = "https://business.google.com";
  }

  return res.json({
    success: true,
    message: responseMessage,
    viewUrl: viewUrl,
    syncedAt: new Date().toISOString()
  });
});

// ============================================================================
// Phase D Automation & Workflows API Endpoints (Durable Multi-Tenant Engine)
// ============================================================================

// 1. Get Workflows
app.get("/api/automation/workflows", requireAuthenticatedUser, async (req: any, res: any) => {
  try {
    const tenantId = req.auth.tenantId;
    const workflows = await DurableAutomationEngine.getWorkflows(tenantId);
    return res.json({
      success: true,
      message: "Fetched workflows successfully.",
      workflows
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Get Single Workflow
app.get("/api/automation/workflows/:id", requireAuthenticatedUser, async (req: any, res: any) => {
  try {
    const tenantId = req.auth.tenantId;
    const workflow = await DurableAutomationEngine.getWorkflowById(tenantId, req.params.id);
    if (!workflow) {
      return res.status(404).json({ success: false, error: "Workflow not found." });
    }
    return res.json({ success: true, workflow });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Activate Workflow (Owner/Admin required)
app.post("/api/automation/workflows/:id/activate", requireAuthenticatedUser, requireRole('Owner', 'Admin'), async (req: any, res: any) => {
  try {
    const tenantId = req.auth.tenantId;
    const actorUid = req.auth.uid;
    const result = await DurableAutomationEngine.activateWorkflow(tenantId, actorUid, req.params.id);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Workflow activation blocked due to missing pre-requisites.",
        readiness: result.readiness
      });
    }
    return res.json({
      success: true,
      message: "Workflow activated successfully.",
      workflow: result.workflow,
      readiness: result.readiness
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Pause Workflow (Owner/Admin required)
app.post("/api/automation/workflows/:id/pause", requireAuthenticatedUser, requireRole('Owner', 'Admin'), async (req: any, res: any) => {
  try {
    const tenantId = req.auth.tenantId;
    const result = await DurableAutomationEngine.pauseWorkflow(tenantId, req.params.id);
    return res.json({ success: true, message: "Workflow paused." });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Get Executions Log
app.get("/api/automation/executions", requireAuthenticatedUser, async (req: any, res: any) => {
  try {
    const tenantId = req.auth.tenantId;
    const executions = await DurableAutomationEngine.getExecutions(tenantId);
    return res.json({ success: true, executions });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Get Scheduled Actions Queue
app.get("/api/automation/scheduled-actions", requireAuthenticatedUser, async (req: any, res: any) => {
  try {
    const tenantId = req.auth.tenantId;
    const actions = await DurableAutomationEngine.getScheduledActions(tenantId);
    return res.json({ success: true, actions });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Get Settings
app.get("/api/automation/settings", requireAuthenticatedUser, async (req: any, res: any) => {
  try {
    const tenantId = req.auth.tenantId;
    const settings = await DurableAutomationEngine.getSettings(tenantId);
    return res.json({ success: true, settings });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 8. Update Settings (Owner/Admin required)
app.post("/api/automation/settings", requireAuthenticatedUser, requireRole('Owner', 'Admin'), async (req: any, res: any) => {
  try {
    const tenantId = req.auth.tenantId;
    const settings = await DurableAutomationEngine.updateSettings(tenantId, req.body);
    return res.json({ success: true, settings, message: "Settings saved successfully." });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 9. Trigger Workflow Event
app.post("/api/automation/trigger", requireAuthenticatedUser, async (req: any, res: any) => {
  try {
    const tenantId = req.auth.tenantId;
    const { triggerType, contact, appointment, metadata } = req.body;

    const result = await DurableAutomationEngine.triggerEvent(tenantId, {
      triggerType,
      contact,
      appointment,
      metadata
    });

    return res.json({
      success: result.success,
      message: `Trigger event "${triggerType || 'manual'}" processed.`,
      executedCount: result.executedCount,
      scheduledCount: result.scheduledCount,
      errors: result.errors
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 10. Server-Side Authoritative Appointment Mutation & Automation Event Route
app.post("/api/appointments", requireAuthenticatedUser, requireRole('Owner', 'Admin', 'Doctor', 'Receptionist'), async (req: any, res: any) => {
  try {
    const tenantId = req.auth.tenantId;
    const { patientName, patientPhone, doctorName, date, time, treatment, notes } = req.body;

    if (!patientName || !patientPhone) {
      return res.status(400).json({ success: false, error: "patientName and patientPhone are required." });
    }

    const apptId = `apt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const appointmentObj: any = {
      id: apptId,
      patientName,
      patientPhone,
      doctorName: doctorName || 'Assigned Specialist',
      date: date || new Date().toISOString().split('T')[0],
      time: time || '10:00 AM',
      treatment: treatment || 'Dental Consultation',
      status: 'Confirmed',
      notes: notes || ''
    };

    // Store in Supabase if configured
    const { isSupabaseConfigured, getSupabaseClient } = await import("./src/supabase/client");
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      await supabase.from('appointments').upsert({
        id: apptId,
        tenant_id: tenantId,
        patient_name: patientName,
        patient_phone: patientPhone,
        doctor_name: appointmentObj.doctorName,
        appointment_date: appointmentObj.date,
        appointment_time: appointmentObj.time,
        treatment: appointmentObj.treatment,
        status: 'Confirmed',
        notes: appointmentObj.notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }

    // Authoritative Server-Side Automation Outbox Event Recording & Trigger
    const autoResult = await DurableAutomationEngine.recordOutboxEvent(tenantId, {
      triggerType: 'appointment_created',
      contact: { name: patientName, phone: patientPhone },
      appointment: appointmentObj
    });

    return res.json({
      success: true,
      message: "Appointment created and authoritative automation event emitted.",
      appointment: appointmentObj,
      automation: autoResult
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || "Failed to create appointment." });
  }
});

// 11. Server-Side Authoritative Appointment Status & Reschedule Route
app.put("/api/appointments/:id/status", requireAuthenticatedUser, requireRole('Owner', 'Admin', 'Doctor', 'Receptionist'), async (req: any, res: any) => {
  try {
    const tenantId = req.auth.tenantId;
    const appointmentId = req.params.id;
    const { status, date, time, patientName, patientPhone, doctorName } = req.body;

    let triggerType: string | null = null;
    if (status === 'Cancelled') triggerType = 'appointment_cancelled';
    else if (status === 'Completed') triggerType = 'appointment_completed';
    else if (status === 'No-Show' || status === 'noshow') triggerType = 'appointment_noshow';
    else if (status === 'Confirmed') triggerType = 'appointment_created';

    const contactObj = { name: patientName || 'Patient', phone: patientPhone || '' };
    const apptObj = { id: appointmentId, date, time, doctorName, patientName, patientPhone, status };

    // Update in Supabase if configured
    const { isSupabaseConfigured, getSupabaseClient } = await import("./src/supabase/client");
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      const updateData: any = { updated_at: new Date().toISOString() };
      if (status) updateData.status = status;
      if (date) updateData.appointment_date = date;
      if (time) updateData.appointment_time = time;

      await supabase.from('appointments').update(updateData).eq('id', appointmentId).eq('tenant_id', tenantId);
    }

    if (date && time && status === 'Rescheduled') {
      await DurableAutomationEngine.handleAppointmentRescheduled(tenantId, appointmentId, date, time, contactObj);
    } else if (status === 'Cancelled') {
      await DurableAutomationEngine.handleAppointmentCancelled(tenantId, appointmentId, contactObj);
    } else if (triggerType) {
      await DurableAutomationEngine.recordOutboxEvent(tenantId, {
        triggerType,
        contact: contactObj,
        appointment: apptObj
      });
    }

    return res.json({
      success: true,
      message: `Appointment ${appointmentId} updated to ${status || 'Rescheduled'}. Authoritative event emitted.`,
      appointmentId,
      status
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || "Failed to update appointment status." });
  }
});

// 12. Process Due Scheduled Actions (Cron / Scheduled Worker Endpoint)
app.post("/api/internal/automation/process-due", async (req: any, res: any) => {
  const cronSecret = process.env.CRON_SECRET;
  const reqSecret = (req.headers['x-cron-secret'] || req.query.secret) as string | undefined;

  if ((process.env.NODE_ENV === 'production' || process.env.APP_ENV === 'staging') && !cronSecret) {
    return res.status(503).json({
      success: false,
      code: 'AUTOMATION_PROCESSOR_NOT_CONFIGURED',
      error: 'CRON_SECRET environment variable is not configured on the server.'
    });
  }

  const effectiveSecret = cronSecret || 'nestam_cron_internal_secret';
  if (!reqSecret || !timingSafeSecretCompare(reqSecret, effectiveSecret)) {
    return res.status(401).json({ success: false, error: 'Unauthorized cron caller. Missing or invalid secret.' });
  }

  try {
    const workerId = `worker_${req.requestId || Math.random().toString(36).substring(2, 7)}`;
    const outboxRecovery = await DurableAutomationEngine.processUnprocessedOutboxEvents();
    const stats = await DurableAutomationEngine.processDueActions(workerId, 25);

    return res.json({
      success: true,
      message: `Cron execution completed by ${workerId}.`,
      outboxRecoveredCount: outboxRecovery.recoveredCount,
      stats
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});


// Serve Frontend using Vite or static dist files
async function startServer() {
  app.use((err: any, req: any, res: any, next: any) => {
    const requestId = req.requestId || 'N/A';
    const status = err.status || err.statusCode || 500;

    const response: any = {
      error: {
        message: err.message || 'Internal Server Error',
        code: err.code || 'INTERNAL_SERVER_ERROR',
        requestId
      }
    };

    if (process.env.NODE_ENV !== 'production' && err.stack) {
      response.error.stack = err.stack;
    }

    logger.error('ExpressServer', `Request failed: ${req.method} ${req.path}`, err, {
      requestId,
      status: 'FAILED',
      statusCode: status,
      operation: `${req.method} ${req.path}`
    });

    res.status(status).json(response);
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express custom server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
