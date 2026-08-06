export type AiSafetyFinding = {
  code: 'PROMPT_TOO_LONG' | 'PROMPT_INJECTION_RISK' | 'EMPTY_PROMPT';
  severity: 'low' | 'medium' | 'high';
  message: string;
};

export type AiSafetyResult = {
  allowed: boolean;
  findings: AiSafetyFinding[];
  sanitizedPrompt: string;
};

const DEFAULT_MAX_PROMPT_CHARS = 6000;

const injectionPatterns: Array<{pattern: RegExp; message: string}> = [
  {
    pattern: /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|rules|prompts)/i,
    message: 'Prompt asks the model to ignore higher-priority instructions.',
  },
  {
    pattern: /reveal\s+(the\s+)?(system|developer)\s+(prompt|message|instructions)/i,
    message: 'Prompt attempts to reveal hidden instructions.',
  },
  {
    pattern: /exfiltrate|steal|leak\s+(secrets?|tokens?|api\s*keys?)/i,
    message: 'Prompt requests secret exfiltration.',
  },
  {
    pattern: /act\s+as\s+(?:if\s+)?(?:you\s+are\s+)?(?:unrestricted|jailbroken|developer\s+mode)/i,
    message: 'Prompt attempts to bypass safety controls.',
  },
];

export function redactSensitiveText(input: string): string {
  return input
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted-email]')
    .replace(/\b(?:\+?91[-\s]?)?[6-9]\d{9}\b/g, '[redacted-phone]')
    .replace(/\b(?:sk|AIza|ya29|EAAG)[A-Za-z0-9._-]{12,}\b/g, '[redacted-token]');
}

export function evaluateAiPromptSafety(prompt: string, maxChars = DEFAULT_MAX_PROMPT_CHARS): AiSafetyResult {
  const findings: AiSafetyFinding[] = [];
  const normalizedPrompt = prompt.trim();

  if (!normalizedPrompt) {
    findings.push({
      code: 'EMPTY_PROMPT',
      severity: 'high',
      message: 'Prompt must not be empty.',
    });
  }

  if (normalizedPrompt.length > maxChars) {
    findings.push({
      code: 'PROMPT_TOO_LONG',
      severity: 'medium',
      message: `Prompt exceeds ${maxChars} characters.`,
    });
  }

  for (const {pattern, message} of injectionPatterns) {
    if (pattern.test(normalizedPrompt)) {
      findings.push({
        code: 'PROMPT_INJECTION_RISK',
        severity: 'high',
        message,
      });
    }
  }

  return {
    allowed: !findings.some((finding) => finding.severity === 'high'),
    findings,
    sanitizedPrompt: redactSensitiveText(normalizedPrompt),
  };
}

export function requireValidChatbotFlow(flow: unknown): {valid: boolean; errors: string[]} {
  const errors: string[] = [];

  if (!flow || typeof flow !== 'object') {
    return {valid: false, errors: ['Flow must be an object.']};
  }

  const candidate = flow as {nodes?: unknown; edges?: unknown; version?: unknown};
  if (!Array.isArray(candidate.nodes) || candidate.nodes.length === 0) {
    errors.push('Flow must include at least one node.');
  }

  if (!Array.isArray(candidate.edges)) {
    errors.push('Flow edges must be an array.');
  }

  if (typeof candidate.version !== 'string' || !candidate.version.trim()) {
    errors.push('Flow version is required for publish/rollback safety.');
  }

  return {valid: errors.length === 0, errors};
}
