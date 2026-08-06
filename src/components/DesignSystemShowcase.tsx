import React, { useState } from 'react';
import {
  Button,
  IconButton,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  PageHeader,
  SectionHeader,
  StatusBadge,
  Input,
  Select,
  Textarea,
  Toggle,
  Tabs,
  TabPanel,
  Tooltip,
  EmptyState,
  LoadingSkeleton,
  ErrorState,
  Modal,
  Toast,
} from './ui';
import { Send, Plus, Trash2, Search, Settings, ShieldAlert, Sparkles, Filter } from 'lucide-react';

export const DesignSystemShowcase: React.FC = () => {
  const [activeTab, setActiveTab] = useState('buttons');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDestructiveModalOpen, setIsDestructiveModalOpen] = useState(false);
  const [toggleVal, setToggleVal] = useState(true);
  const [btnLoading, setBtnLoading] = useState(false);
  const [toastVisible, setToastVisible] = useState(true);

  const tabsList = [
    { id: 'buttons', label: 'Buttons & Icons', icon: <Send className="h-4 w-4" /> },
    { id: 'inputs', label: 'Form Inputs', icon: <Settings className="h-4 w-4" /> },
    { id: 'badges', label: 'Status Badges', icon: <Sparkles className="h-4 w-4" />, badge: 9 },
    { id: 'feedback', label: 'Modals & Feedback', icon: <ShieldAlert className="h-4 w-4" /> },
  ];

  const handleSimulateSubmit = () => {
    setBtnLoading(true);
    setTimeout(() => {
      setBtnLoading(false);
    }, 1500);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 sm:p-6 bg-[#F6F8F8] min-h-screen">
      <PageHeader
        title="Vyapari Nestam Design System Foundation"
        description="Phase B standardized visual tokens, accessible typography, and unified UI primitives."
        badge={<StatusBadge status="success" label="Phase B Ready" />}
      />

      <Tabs tabs={tabsList} activeTabId={activeTab} onChange={setActiveTab} variant="pills" />

      {/* Tab 1: Buttons & Controls */}
      <TabPanel id="buttons" activeTabId={activeTab}>
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Button Variants & Double-Submission Protection</CardTitle>
            <CardDescription>
              All buttons feature primary teal (#176B72), accessible hover states, and built-in click prevention when loading.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />}>
                Primary Button
              </Button>
              <Button variant="secondary" leftIcon={<Filter className="h-4 w-4" />}>
                Secondary Button
              </Button>
              <Button variant="ghost">Ghost Button</Button>
              <Button variant="destructive" leftIcon={<Trash2 className="h-4 w-4" />}>
                Destructive Action
              </Button>
            </div>

            <div className="pt-4 border-t border-[#DDE5E5] space-y-3">
              <SectionHeader
                title="Interactive Submission Simulation"
                description="Clicking 'Simulate Request' disables the button and prevents duplicate click calls."
              />
              <div className="flex items-center gap-3">
                <Button
                  variant="primary"
                  isLoading={btnLoading}
                  onClick={handleSimulateSubmit}
                  leftIcon={<Send className="h-4 w-4" />}
                >
                  {btnLoading ? 'Processing API Call...' : 'Simulate Request'}
                </Button>
                <Button variant="secondary" size="compact" disabled>
                  Disabled State
                </Button>
              </div>
            </div>

            <div className="pt-4 border-t border-[#DDE5E5] space-y-3">
              <SectionHeader title="Icon Buttons with Accessible Labels" />
              <div className="flex items-center gap-3">
                <Tooltip content="Quick Search">
                  <IconButton icon={<Search className="h-4 w-4" />} aria-label="Search records" variant="primary" />
                </Tooltip>
                <Tooltip content="Open Workspace Settings">
                  <IconButton icon={<Settings className="h-4 w-4" />} aria-label="Settings" variant="secondary" />
                </Tooltip>
                <Tooltip content="Delete Record">
                  <IconButton icon={<Trash2 className="h-4 w-4" />} aria-label="Delete" variant="destructive" />
                </Tooltip>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabPanel>

      {/* Tab 2: Inputs */}
      <TabPanel id="inputs" activeTabId={activeTab}>
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Accessible Form Inputs</CardTitle>
            <CardDescription>
              Inputs support persistent field labels, required indicators (*), helper text, and aria-describedby inline errors.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Clinic / Business Name"
              placeholder="e.g. Apollo Healthcare Clinic"
              required
              helperText="Enter your legally registered clinic or business entity name."
              leftIcon={<Search className="h-4 w-4" />}
            />

            <Input
              label="Contact Phone Number"
              placeholder="+91 98765 43210"
              errorMessage="Invalid Indian mobile phone number format."
              required
            />

            <Select label="Primary Medical Sector" required helperText="Select one of the 12 approved sectors.">
              <option value="general_medical">General Medical & Multispecialty Clinic</option>
              <option value="dental">Dental Clinic</option>
              <option value="dermatology">Dermatology & Cosmetology</option>
            </Select>

            <div className="flex items-center pt-6">
              <Toggle
                label="Enable Automated Patient Reminders"
                description="Automatically dispatch WhatsApp follow-ups 24h prior to appointment."
                checked={toggleVal}
                onChange={setToggleVal}
              />
            </div>

            <div className="md:col-span-2">
              <Textarea
                label="Workspace Description"
                placeholder="Briefly describe your medical services..."
                helperText="This context is used by the AI assistant during automated replies."
              />
            </div>
          </CardContent>
        </Card>
      </TabPanel>

      {/* Tab 3: Badges */}
      <TabPanel id="badges" activeTabId={activeTab}>
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Semantic Status Badges</CardTitle>
            <CardDescription>
              Status badges do not rely on color alone. Each badge features high-contrast text, clear background shading, and an explanatory icon.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            <StatusBadge status="success" label="Active & Verified" />
            <StatusBadge status="active" label="Live Session" />
            <StatusBadge status="warning" label="Setup Warning" />
            <StatusBadge status="pending" label="Pending SLA" />
            <StatusBadge status="error" label="Activation Blocked" />
            <StatusBadge status="inactive" label="Suspended" />
            <StatusBadge status="info" label="Information" />
            <StatusBadge status="neutral" label="Default State" />
            <StatusBadge status="unconfigured" label="Not Configured" />
          </CardContent>
        </Card>
      </TabPanel>

      {/* Tab 4: Modals & Feedback */}
      <TabPanel id="feedback" activeTabId={activeTab}>
        <div className="space-y-6">
          {toastVisible && (
            <Toast
              type="success"
              title="Design Foundation Loaded"
              message="All 17 shared primitives pass accessibility, WCAG contrast, and TypeScript standards."
              onClose={() => setToastVisible(false)}
            />
          )}

          <Card padding="lg">
            <CardHeader>
              <CardTitle>Dialogs, Empty States, and Error Handling</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-wrap gap-4">
                <Button variant="primary" onClick={() => setIsModalOpen(true)}>
                  Open Standard Dialog
                </Button>
                <Button variant="destructive" onClick={() => setIsDestructiveModalOpen(true)}>
                  Open Destructive Dialog
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                <EmptyState
                  title="No Appointments Scheduled Today"
                  description="All patient follow-ups for this tenant are up to date."
                  action={{
                    label: 'Schedule New Appointment',
                    onClick: () => alert('Mock schedule action'),
                    leftIcon: <Plus className="h-4 w-4" />,
                  }}
                />

                <ErrorState
                  title="WhatsApp Outbound Gateway Offline"
                  message="Meta Webhook signature check succeeded, but outbound worker pool is silent."
                  onRetry={() => alert('Retrying gateway connection...')}
                />
              </div>

              <div className="pt-4 space-y-2">
                <h4 className="text-xs font-semibold text-[#5F6F71]">Loading Skeletons (No Layout Shifts)</h4>
                <div className="space-y-2">
                  <LoadingSkeleton variant="table-row" />
                  <LoadingSkeleton variant="table-row" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabPanel>

      {/* Standard Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Workspace Configuration Parameters"
        description="Verify tenant-scoped settings before activating WhatsApp messaging features."
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>

            <Button variant="primary" onClick={() => setIsModalOpen(false)}>
              Save Settings
            </Button>
          </>
        }
      >
        <p className="text-sm text-[#5F6F71]">
          This dialog traps keyboard focus, listens for Escape key dismissal, and returns focus to the trigger element upon closing.
        </p>
        <Input label="Meta App ID" placeholder="1234567890" required />
      </Modal>

      {/* Destructive Modal */}
      <Modal
        isOpen={isDestructiveModalOpen}
        onClose={() => setIsDestructiveModalOpen(false)}
        title="Permanently Remove WhatsApp Template?"
        description="This action cannot be undone. All active journey references will be unlinked."
        isDestructive
        destructiveConfirmText="Yes, Delete Template"
        onConfirmDestructive={() => {
          alert('Template deleted.');
          setIsDestructiveModalOpen(false);
        }}
      />
    </div>
  );
};
