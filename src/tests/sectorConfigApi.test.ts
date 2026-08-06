import { describe, it, expect, beforeEach } from 'vitest';
import { SectorConfigService, sectorConfigStore } from '../services/sector/SectorConfigService';
import { APPROVED_MEDICAL_SECTOR_IDS } from '../industryConfig';

describe('Phase 3 Step 1: API & Security Validation Suite', () => {
  const tenantA = 'tenant_alpha_101';
  const tenantB = 'tenant_beta_202';

  beforeEach(() => {
    sectorConfigStore.clear();
  });

  it('1. Enforces Tenant Isolation (Tenant A vs Tenant B independent state)', async () => {
    // Initialize Tenant A with dental
    const configA1 = await SectorConfigService.getTenantSectorConfig(tenantA);
    expect(configA1.sectorId).toBe('dental');

    // Switch Tenant A to dermatology
    await SectorConfigService.applySectorConfig(tenantA, 'dermatology', 'admin@alpha.com', 'CONFIRM CHANGE');

    // Initialize Tenant B
    const configB1 = await SectorConfigService.getTenantSectorConfig(tenantB);
    expect(configB1.sectorId).toBe('dental'); // Default for new tenant
    expect(configB1.version).toBe(1);

    // Verify Tenant A is on dermatology v2 while Tenant B is completely isolated on dental v1
    const configA2 = await SectorConfigService.getTenantSectorConfig(tenantA);
    expect(configA2.sectorId).toBe('dermatology');
    expect(configA2.version).toBe(2);

    const historyA = await SectorConfigService.getSectorHistory(tenantA);
    const historyB = await SectorConfigService.getSectorHistory(tenantB);

    expect(historyA.length).toBe(2);
    expect(historyB.length).toBe(1);
    expect(historyA[1].tenantId).toBe(tenantA);
    expect(historyB[0].tenantId).toBe(tenantB);
  });

  it('2. Validates 12 approved medical sectors strictly', async () => {
    expect(APPROVED_MEDICAL_SECTOR_IDS.length).toBe(12);

    // Reject unapproved or non-medical sector IDs
    await expect(
      SectorConfigService.generateImpactPreview(tenantA, 'gym' as any)
    ).rejects.toThrow('Invalid sector ID "gym"');

    await expect(
      SectorConfigService.applySectorConfig(tenantA, 'realestate' as any, 'admin@alpha.com', 'CONFIRM CHANGE')
    ).rejects.toThrow('Invalid sector ID "realestate"');
  });

  it('3. Preserves core patient and appointment data across sector preset switches', async () => {
    const preview = await SectorConfigService.generateImpactPreview(tenantA, 'multispecialty');
    expect(preview.preservedDataSummary.patientsPreserved).toBe(true);
    expect(preview.preservedDataSummary.appointmentsPreserved).toBe(true);
    expect(preview.preservedDataSummary.paymentsPreserved).toBe(true);
    expect(preview.preservedDataSummary.consentRecordsPreserved).toBe(true);
    expect(preview.preservedDataSummary.auditLogsPreserved).toBe(true);
  });

  it('4. Enforces strict typed confirmation on apply and rollback', async () => {
    await expect(
      SectorConfigService.applySectorConfig(tenantA, 'multispecialty', 'admin@alpha.com', 'WRONG_CONFIRMATION')
    ).rejects.toThrow('Typed confirmation mismatch');

    await expect(
      SectorConfigService.rollbackSectorConfig(tenantA, 1, 'admin@alpha.com', 'NO_ROLLBACK')
    ).rejects.toThrow('Typed confirmation mismatch');
  });

  it('5. Fails closed on activation when blocking readiness checks are incomplete', async () => {
    const readiness = await SectorConfigService.evaluateReadiness(tenantA, {
      hasMetaConnected: false,
      hasGoogleConnected: false,
    });

    expect(readiness.canActivate).toBe(false);
    expect(readiness.blockingCount).toBeGreaterThan(0);

    await expect(
      SectorConfigService.activateWorkspace(tenantA, 'admin@alpha.com', {
        hasMetaConnected: false,
      })
    ).rejects.toThrow('ACTIVATION_BLOCKED');
  });

  it('6. Activates workspace dynamically when all 12 activation gate requirements pass', async () => {
    const activated = await SectorConfigService.activateWorkspace(tenantA, 'admin@alpha.com', {
      hasMetaConnected: true,
      hasGoogleConnected: true,
      hasCalendarTested: true,
      hasEndToEndTestPassed: true,
      hasPrivacyAcknowledged: true,
    });

    expect(activated.activationStatus).toBe('active');
    expect(activated.version).toBe(2);

    const history = await SectorConfigService.getSectorHistory(tenantA);
    const lastEvent = history[history.length - 1];
    expect(lastEvent.changeType).toBe('activation');
  });
});
