import { describe, it, expect, beforeEach } from 'vitest';
import { 
  APPROVED_MEDICAL_SECTOR_IDS, 
  getSectorDefinition, 
  isApprovedSectorId, 
  LEGACY_SECTOR_MIGRATION_MAP, 
  UNCONFIGURED_SECTOR 
} from '../industryConfig';
import { SectorConfigService, sectorConfigStore } from '../services/sector/SectorConfigService';

describe('Dental Fallback Correction & Strict Validation Suite', () => {
  const testTenant = 'tenant_validation_test_101';

  beforeEach(() => {
    sectorConfigStore.clear();
  });

  it('1. Every approved sector resolves correctly', () => {
    expect(APPROVED_MEDICAL_SECTOR_IDS.length).toBe(12);
    APPROVED_MEDICAL_SECTOR_IDS.forEach((sectorId) => {
      expect(isApprovedSectorId(sectorId)).toBe(true);
      const def = getSectorDefinition(sectorId);
      expect(def.id).toBe(sectorId);
      expect(def.name).not.toBe('Sector not configured');
    });
  });

  it('2. Empty sector does not resolve to Dental', () => {
    expect(isApprovedSectorId('')).toBe(false);
    
    const defEmpty = getSectorDefinition('');
    expect(defEmpty.name).toBe('Sector not configured');
    expect(defEmpty.id).not.toBe('dental');

    const defUndefined = getSectorDefinition(undefined);
    expect(defUndefined.name).toBe('Sector not configured');
    expect(defUndefined.id).not.toBe('dental');
  });

  it('3. Unknown sector does not resolve to Dental', () => {
    expect(isApprovedSectorId('unknown_sector_xyz')).toBe(false);

    const defUnknown = getSectorDefinition('unknown_sector_xyz');
    expect(defUnknown.name).toBe('Sector not configured');
    expect(defUnknown.id).not.toBe('dental');
    expect(defUnknown.terminology.patientLabel).toBe('Customer');
  });

  it('4. Malformed and case-altered IDs are rejected', () => {
    expect(isApprovedSectorId('DENTAL')).toBe(false);
    expect(isApprovedSectorId('Dental')).toBe(false);
    expect(isApprovedSectorId(' dental ')).toBe(false);
    expect(isApprovedSectorId('dental_123')).toBe(false);

    const defUpper = getSectorDefinition('DENTAL');
    expect(defUpper.name).toBe('Sector not configured');
    expect(defUpper.id).not.toBe('dental');
  });

  it('5. Approved legacy mappings resolve correctly', () => {
    expect(getSectorDefinition('cosmetic').id).toBe('dermatology');
    expect(getSectorDefinition('gym').id).toBe('wellness');
    expect(getSectorDefinition('realestate').id).toBe('general_medical');
  });

  it('6. Unmapped legacy IDs remain blocked', () => {
    expect(isApprovedSectorId('unmapped_legacy_sector')).toBe(false);

    const defUnmapped = getSectorDefinition('unmapped_legacy_sector');
    expect(defUnmapped.name).toBe('Sector not configured');
    expect(defUnmapped.id).not.toBe('dental');
  });

  it('7. UI renders the neutral setup-required state without crashing', () => {
    expect(UNCONFIGURED_SECTOR.name).toBe('Sector not configured');
    expect(UNCONFIGURED_SECTOR.defaultBusinessName).toBe('Business');
    expect(UNCONFIGURED_SECTOR.terminology.patientLabel).toBe('Customer');
    expect(UNCONFIGURED_SECTOR.terminology.patientsLabel).toBe('Customers');
    expect(UNCONFIGURED_SECTOR.terminology.treatmentLabel).toBe('Service');
    expect(UNCONFIGURED_SECTOR.terminology.doctorLabel).toBe('Staff');
    expect(UNCONFIGURED_SECTOR.defaultServices.length).toBe(0);
    expect(UNCONFIGURED_SECTOR.defaultAutomationRules.length).toBe(0);
  });

  it('8. API mutations return INVALID_SECTOR_ID', async () => {
    await expect(
      SectorConfigService.generateImpactPreview(testTenant, 'invalid_sector_99' as any)
    ).rejects.toThrow('INVALID_SECTOR_ID');

    await expect(
      SectorConfigService.applySectorConfig(testTenant, 'invalid_sector_99' as any, 'admin@test.com', 'CONFIRM CHANGE')
    ).rejects.toThrow('INVALID_SECTOR_ID');
  });

  it('9. Activation fails closed without a valid sector', async () => {
    // Manually insert an unconfigured / invalid sector record in store
    sectorConfigStore.set(testTenant, {
      tenantId: testTenant,
      sectorId: '' as any,
      version: 1,
      activationStatus: 'draft',
      terminology: {},
      serviceCatalogue: [],
      presetConfig: {},
      customizations: {},
      readinessChecklist: {},
      selectedBy: 'test',
      selectedAt: new Date().toISOString(),
      lastChangedBy: 'test',
      lastChangedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await expect(
      SectorConfigService.activateWorkspace(testTenant, 'admin@test.com', {
        hasMetaConnected: true,
        hasGoogleConnected: true,
        hasCalendarTested: true,
        hasEndToEndTestPassed: true,
        hasPrivacyAcknowledged: true,
      })
    ).rejects.toThrow('INVALID_SECTOR_ID');
  });
});
