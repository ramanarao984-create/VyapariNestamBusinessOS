import { describe, it, expect, beforeEach } from 'vitest';
import { AutomationService } from '../services/automation/AutomationService';
import { PREBUILT_WORKFLOW_TEMPLATES } from '../services/automation/workflowTemplatesData';

describe('Phase D — Automation & Workflows Engine', () => {
  beforeEach(() => {
    // Provide polyfill mock for localStorage during Vitest execution
    const storage: Record<string, string> = {};
    global.localStorage = {
      getItem: (key: string) => storage[key] || null,
      setItem: (key: string, value: string) => { storage[key] = value; },
      removeItem: (key: string) => { delete storage[key]; },
      clear: () => { Object.keys(storage).forEach(k => delete storage[k]); },
      length: 0,
      key: (i: number) => null
    } as any;
  });

  it('should load default 10 prebuilt workflow templates', () => {
    expect(PREBUILT_WORKFLOW_TEMPLATES.length).toBe(10);
    const titles = PREBUILT_WORKFLOW_TEMPLATES.map(t => t.title);
    expect(titles).toContain('Appointment Confirmation');
    expect(titles).toContain('24-Hour Appointment Reminder');
    expect(titles).toContain('1-Hour Appointment Reminder');
    expect(titles).toContain('No-Show Follow-Up');
    expect(titles).toContain('WhatsApp Reschedule Assistant');
    expect(titles).toContain('Post-Visit Thank You');
    expect(titles).toContain('Google Review Request');
    expect(titles).toContain('Treatment or Service Follow-Up');
    expect(titles).toContain('New Lead Instant Response');
    expect(titles).toContain('Inactive Customer Recall');
  });

  it('should load initial active workflows seeded from templates', () => {
    const workflows = AutomationService.getWorkflows();
    expect(workflows.length).toBeGreaterThanOrEqual(10);
    expect(workflows[0].status).toBe('active');
  });

  it('should save and delete workflows', () => {
    const initial = AutomationService.getWorkflows();
    const countBefore = initial.length;

    const newWf = {
      ...initial[0],
      id: 'wf_test_101',
      name: 'Custom Test Workflow'
    };

    const updated = AutomationService.saveWorkflow(newWf);
    expect(updated.length).toBe(countBefore + 1);

    const afterDelete = AutomationService.deleteWorkflow('wf_test_101');
    expect(afterDelete.length).toBe(countBefore);
  });

  it('should trigger workflow event and record execution log', () => {
    const execBefore = AutomationService.getExecutions().length;

    const res = AutomationService.triggerWorkflow('appointment_created', {
      contact: {
        id: 'cnt_123',
        name: 'Test Patient',
        phone: '+91 98765 43210',
        category: 'Active',
        notes: '',
        lastContacted: new Date().toISOString(),
        createdAt: new Date().toISOString()
      }
    });

    expect(res.executed).toBeGreaterThan(0);
    const execAfter = AutomationService.getExecutions();
    expect(execAfter.length).toBe(execBefore + res.executed);
    expect(execAfter[0].contactName).toBe('Test Patient');
  });

  it('should perform dry-run test of a workflow with variable replacement', () => {
    const workflows = AutomationService.getWorkflows();
    const result = AutomationService.testWorkflow(workflows[0], {
      id: 'cnt_456',
      name: 'Anitha Rao',
      phone: '+91 91234 56789',
      category: 'Active',
      notes: '',
      lastContacted: new Date().toISOString(),
      createdAt: new Date().toISOString()
    });

    expect(result.success).toBe(true);
    expect(result.logs.length).toBeGreaterThan(0);
    expect(result.previewMessage).toContain('Anitha Rao');
    expect(result.previewMessage).toContain('Sri Sai Dental Clinic');
  });
});
