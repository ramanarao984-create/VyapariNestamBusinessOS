export type TemplateValue = string | number | boolean | Date | null | undefined;

export interface TemplateContext {
  [key: string]: TemplateValue;
}

export class TemplateCompilationError extends Error {
  public readonly code = 'TEMPLATE_VARIABLES_UNRESOLVED';

  constructor(public readonly variables: string[]) {
    super(`Missing or unknown template variables: ${variables.join(', ')}.`);
    this.name = 'TemplateCompilationError';
  }
}

const aliases: Record<string, string> = {
  contactName: 'name',
  patientName: 'name',
  date: 'appointmentDate',
  time: 'appointmentTime',
};

const tagPattern = /\{\{\s*([a-zA-Z][a-zA-Z0-9_]*)\s*\}\}/g;

function displayValue(value: TemplateValue): string | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  if (value instanceof Date) {
    return value.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  return String(value);
}

/**
 * Resolves only explicit {{tag}} placeholders. Missing values fail closed so
 * a patient never receives raw template syntax by accident.
 */
export function compileTemplateText(template: string, context: TemplateContext): string {
  const missing = new Set<string>();

  const compiled = template.replace(tagPattern, (_match, rawKey: string) => {
    const key = aliases[rawKey] || rawKey;
    const value = displayValue(context[key]);
    if (value === undefined) {
      missing.add(rawKey);
      return _match;
    }
    return value;
  });

  if (missing.size > 0 || tagPattern.test(compiled)) {
    tagPattern.lastIndex = 0;
    const unresolved = Array.from(new Set(Array.from(compiled.matchAll(tagPattern), (match) => match[1])));
    throw new TemplateCompilationError(unresolved.length > 0 ? unresolved : Array.from(missing));
  }

  return compiled;
}

export function containsTemplateVariables(value: string): boolean {
  tagPattern.lastIndex = 0;
  return tagPattern.test(value);
}
