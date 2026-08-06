import { describe, it, expect, beforeEach } from 'vitest';
import { SectorConfigService, sectorConfigStore } from '../services/sector/SectorConfigService';
import { APPROVED_MEDICAL_SECTOR_IDS } from '../industryConfig';

describe('Phase 3 Step 1: SectorConfigService & Activation Gate Tests', () => {
  const tenantId = 'test-tenant-101';

  beforeEach(() => {
    sectorConfigStore.clear();
  });

  it('1. Supports exactly the 12 approved medical sectors', () => {
    expect(APPROVED_MEDICAL_SECTOR_IDS.length).toBe(12);
    expect(APPROVED_MEDICAL_SECTOR_IDS).toContain('dental');
    expect(APPROVED_MEDICAL_SECTOR_IDS).toContain('dermatology');
    expect(APPROVED_MEDICAL_SECTOR_IDS).toContain('multispecialty');
    expect(APPROVED_MEDICAL_SECTOR_IDS).not.toContain('gym');
    expect(APPROVED_MEDICAL_SECTOR_IDS).not.toContain('realestate');
  });

  it('2. Initializes tenant sector config with default draft version 1', async () => {
    const config = await SectorConfigService.getTenantSectorConfig(tenantId);
    expect(config.tenantId).toBe(tenantId);
    expect(config.sectorId).toBe('dental');
    expect(config.version).toBe(1);
    expect(config.activationStatus).toBe('draft');
    expect(config.terminology.patientLabel || config.terminology.patient).toBe('Patient');
  });

  it('3. Generates impact preview when requesting sector switch', async () => {
    const preview = await SectorConfigService.generateImpactPreview(tenantId, 'dermatology');
    expect(preview.currentSectorId).toBe('dental');
    expect(preview.targetSectorId).toBe('dermatology');
    expect(preview.targetSectorName).toBe('Dermatology Clinic');
    expect(preview.preservedDataSummary.patientsPreserved).toBe(true);
    expect(preview.preservedDataSummary.appointmentsPreserved).toBe(true);
  });


  it('4. Rejects application with invalid typed confirmation', async () => {
    await expect(
      SectorConfigService.applySectorConfig(tenantId, 'dermatology', 'admin@test.com', 'WRONG_CONFIRM')
    ).rejects.toThrow('Typed confirmation mismatch');
  });

  it('5. Transactionally applies sector switch and increments version', async () => {
    const updated = await SectorConfigService.applySectorConfig(
      tenantId,
      'dermatology',
      'admin@test.com',
      'CONFIRM CHANGE',
      'retain'
    );

    expect(updated.sectorId).toBe('dermatology');
    expect(updated.version).toBe(2);
    expect(updated.lastChangedBy).toBe('admin@test.com');

    const history = await SectorConfigService.getSectorHistory(tenantId);
    expect(history.length).toBe(2); // Initial (v1) + Switch (v2)
    expect(history[1].version).toBe(2);
    expect(history[1].sectorId).toBe('dermatology');
  });

  it('6. Rolls back to a previous configuration version snapshot', async () => {
    // Version 1 (dental) -> Version 2 (dermatology)
    await SectorConfigService.applySectorConfig(tenantId, 'dermatology', 'admin@test.com', 'CONFIRM CHANGE');

    // Rollback to version 1
    const rolledBack = await SectorConfigService.rollbackSectorConfig(
      tenantId,
      1,
      'admin@test.com',
      'CONFIRM ROLLBACK'
    );

    expect(rolledBack.sectorId).toBe('dental');
    expect(rolledBack.version).toBe(3); // New version for audit trail

    const history = await SectorConfigService.getSectorHistory(tenantId);
    expect(history.length).toBe(3);
  });

  it('7. Calculates 12-item Activation Readiness checklist and enforces blocking gate', async () => {
    // Incomplete context -> Activation blocked
    const evaluation = await SectorConfigService.evaluateReadiness(tenantId, {
      hasMetaConnected: false,
      hasGoogleConnected: false,
      hasCalendarTested: false,
      hasEndToEndTestPassed: false,
      hasPrivacyAcknowledged: false,
    });

    expect(evaluation.checks.length).toBe(12);
    expect(evaluation.canActivate).toBe(false);
    expect(evaluation.overallStatus).toBe('BLOCKED');

    // Attempting activation fails closed
    await expect(
      SectorConfigService.activateWorkspace(tenantId, 'admin@test.com', {
        hasMetaConnected: false,
      })
    ).rejects.toThrow('ACTIVATION_BLOCKED');
  });

  it('8. Activates workspace when all 12 activation gate checks pass', async () => {
    const activated = await SectorConfigService.activateWorkspace(tenantId, 'admin@test.com', {
      hasMetaConnected: true,
      hasGoogleConnected: true,
      hasCalendarTested: true,
      hasEndToEndTestPassed: true,
      hasPrivacyAcknowledged: true,
    });

    expect(activated.activationStatus).toBe('active');
    expect(activated.version).toBe(2);
  });
});
