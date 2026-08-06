/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthHooks';
import { useTenantContext } from '../auth/useTenantContext';
import { OnboardingService, OnboardingParams } from './OnboardingService';
import { OnboardingValidation } from './OnboardingValidation';
import { SubscriptionStatus } from '../services/metadata/types';

export const useOnboarding = (onSuccessCallback?: () => void) => {
  const { user: firebaseUser } = useAuth();
  const tenantContext = useTenantContext();

  const [step, setStep] = useState<number>(1);
  const [formData, setFormData] = useState<OnboardingParams>({
    clinicName: '',
    ownerName: '',
    email: '',
    phone: '',
    spreadsheetId: '',
    driveFolderId: '',
    calendarId: '',
    subscriptionStatus: 'trial',
    firebaseUid: '',
    tenantId: '',
  });

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  // Sync firebase user into formData when authenticated
  useEffect(() => {
    if (firebaseUser) {
      setFormData((prev) => ({
        ...prev,
        firebaseUid: firebaseUser.uid,
        email: prev.email || firebaseUser.email || '',
        ownerName: prev.ownerName || firebaseUser.displayName || '',
      }));
    }
  }, [firebaseUser]);

  // Update a single form field
  const updateField = <K extends keyof OnboardingParams>(name: K, value: OnboardingParams[K]) => {
    setError(null);
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      // Auto-generate tenant ID from clinic name if tenant ID is empty or was auto-generated
      if (name === 'clinicName' && (!prev.tenantId || prev.tenantId === OnboardingService.generateTenantId(prev.clinicName))) {
        updated.tenantId = OnboardingService.generateTenantId(value as string);
      }
      return updated;
    });
  };

  /**
   * Validates form fields for a specific step.
   */
  const validateStep = async (stepNumber: number): Promise<boolean> => {
    setError(null);
    try {
      if (stepNumber === 1) {
        OnboardingValidation.validateClinicName(formData.clinicName);
        OnboardingValidation.validateEmail(formData.email);
        if (!formData.phone || formData.phone.trim() === '') {
          throw new Error('Phone number is required.');
        }
        if (!formData.ownerName || formData.ownerName.trim() === '') {
          throw new Error('Owner name is required.');
        }
        const derivedTenantId = formData.tenantId || OnboardingService.generateTenantId(formData.clinicName);
        OnboardingValidation.validateTenantId(derivedTenantId);
        await OnboardingValidation.validateDuplicateTenantId(derivedTenantId);
      } else if (stepNumber === 2) {
        OnboardingValidation.validateGoogleId(formData.spreadsheetId, 'Spreadsheet');
        OnboardingValidation.validateGoogleId(formData.driveFolderId, 'Drive Folder');
        OnboardingValidation.validateGoogleId(formData.calendarId, 'Calendar');
      } else if (stepNumber === 3) {
        const validStatuses: SubscriptionStatus[] = ['trial', 'active', 'inactive'];
        if (!validStatuses.includes(formData.subscriptionStatus)) {
          throw new Error(`Invalid subscription status: ${formData.subscriptionStatus}`);
        }
      }
      return true;
    } catch (err: any) {
      setError(err.message || 'Validation failed');
      return false;
    }
  };

  /**
   * Proceeds to the next step if valid.
   */
  const nextStep = async () => {
    const isValid = await validateStep(step);
    if (isValid) {
      setStep((prev) => prev + 1);
    }
  };

  /**
   * Goes back to the previous step.
   */
  const prevStep = () => {
    setError(null);
    setStep((prev) => Math.max(1, prev - 1));
  };

  /**
   * Submits the complete onboarding payload to provision the new tenant.
   */
  const submit = async (): Promise<boolean> => {
    setError(null);
    setIsSubmitting(true);

    try {
      // 1. Ensure a user is authenticated
      if (!formData.firebaseUid) {
        throw new Error('No authenticated user found. Please sign in to onboard.');
      }

      // 2. Resolve final tenant ID slug
      const finalTenantId = formData.tenantId?.trim() || OnboardingService.generateTenantId(formData.clinicName);

      // 3. Complete onboarding via Service
      await OnboardingService.completeOnboarding({
        ...formData,
        tenantId: finalTenantId,
      });

      // 4. Force TenantContext to refresh immediately, bypassing caches
      await tenantContext.refresh();

      setIsCompleted(true);
      if (onSuccessCallback) {
        onSuccessCallback();
      }
      return true;
    } catch (err: any) {
      setError(err.message || 'Onboarding failed. Please try again.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    step,
    setStep,
    formData,
    updateField,
    error,
    setError,
    isSubmitting,
    isCompleted,
    nextStep,
    prevStep,
    validateStep,
    submit,
  };
};
