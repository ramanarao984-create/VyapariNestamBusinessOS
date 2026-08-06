import {describe, expect, it} from 'vitest';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(dirname, '../../../supabase/migrations');

const serverOnlyTables = new Set([
  'tenants',
  'tenant_metadata',
  'user_metadata',
  'audit_events',
  'whatsapp_resumption_tokens',
]);

const browserRoles = new Set(['public', 'anon', 'authenticated']);

function normalizeIdentifier(identifier: string): string {
  return identifier
    .replace(/"/g, '')
    .replace(/^public\./i, '')
    .trim()
    .toLowerCase();
}

function readMigrations(): Array<{file: string; sql: string}> {
  return fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort()
    .map((file) => ({
      file,
      sql: fs.readFileSync(path.join(migrationsDir, file), 'utf8'),
    }));
}

function stripComments(sql: string): string {
  return sql
    .replace(/--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');
}

describe('Supabase migration security policy', () => {
  const migrations = readMigrations();
  const combinedSql = stripComments(migrations.map(({sql}) => sql).join('\n'));

  it('enables RLS for tenant-facing tables created by migrations', () => {
    const createdTables = [...combinedSql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?([\w."]+)/gi)]
      .map((match) => normalizeIdentifier(match[1]));

    const rlsTables = new Set(
      [...combinedSql.matchAll(/alter\s+table\s+([\w."]+)\s+enable\s+row\s+level\s+security/gi)]
        .map((match) => normalizeIdentifier(match[1])),
    );

    const missingRls = createdTables.filter((table) => !serverOnlyTables.has(table) && !rlsTables.has(table));

    expect(missingRls).toEqual([]);
  });

  it('does not grant browser roles direct access to server-only tables', () => {
    const violations: string[] = [];

    for (const {file, sql} of migrations) {
      const cleanSql = stripComments(sql);
      for (const table of serverOnlyTables) {
        const grantPattern = new RegExp(
          `grant\\s+[^;]+\\s+on\\s+(?:table\\s+)?(?:public\\.)?${table}\\b[^;]*\\bto\\s+(public|anon|authenticated)\\b`,
          'gi',
        );
        for (const match of cleanSql.matchAll(grantPattern)) {
          violations.push(`${file}: ${table} granted to ${match[1].toLowerCase()}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('leaves SECURITY DEFINER functions unavailable to browser roles in final migration state', () => {
    const securityDefinerFunctions = new Set<string>();
    const executeGrants = new Map<string, Set<string>>();

    for (const {sql} of migrations) {
      const cleanSql = stripComments(sql);
      for (const match of cleanSql.matchAll(/create\s+(?:or\s+replace\s+)?function\s+([\w."]+)\s*\([^;]+?security\s+definer/gis)) {
        securityDefinerFunctions.add(normalizeIdentifier(match[1]));
      }

      for (const match of cleanSql.matchAll(/(grant|revoke)\s+execute\s+on\s+function\s+([\w."]+)\s*\([^;]*?\)\s+(?:to|from)\s+([\w,\s]+);/gi)) {
        const action = match[1].toLowerCase();
        const functionName = normalizeIdentifier(match[2]);
        const roles = match[3]
          .split(',')
          .map((role) => role.trim().toLowerCase())
          .filter(Boolean);

        if (!executeGrants.has(functionName)) {
          executeGrants.set(functionName, new Set());
        }

        const grantedRoles = executeGrants.get(functionName)!;
        for (const role of roles) {
          if (action === 'grant') {
            grantedRoles.add(role);
          } else {
            grantedRoles.delete(role);
          }
        }
      }
    }

    const violations = [...securityDefinerFunctions].flatMap((functionName) => {
      const grantedRoles = executeGrants.get(functionName) ?? new Set<string>();
      return [...grantedRoles]
        .filter((role) => browserRoles.has(role))
        .map((role) => `${functionName} executable by ${role}`);
    });

    expect(violations).toEqual([]);
  });

  it('keeps browser roles out of broad schema grants', () => {
    const broadGrantViolations = migrations.flatMap(({file, sql}) => {
      const cleanSql = stripComments(sql);
      return [...cleanSql.matchAll(/grant\s+all\s+on\s+all\s+(tables|functions|sequences)\s+in\s+schema\s+public\s+to\s+(public|anon|authenticated)\s*;/gi)]
        .map((match) => `${file}: ${match[1].toLowerCase()} granted to ${match[2].toLowerCase()}`);
    });

    expect(broadGrantViolations).toEqual([]);
  });
});
