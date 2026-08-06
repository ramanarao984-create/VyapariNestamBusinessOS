import React, { useEffect, useRef, useId } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { IconButton } from './IconButton';
import { Button } from './Button';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'default' | 'lg' | 'xl' | 'full';
  nonDismissible?: boolean;
  isDestructive?: boolean;
  destructiveConfirmText?: string;
  onConfirmDestructive?: () => void;
  isLoading?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'default',
  nonDismissible = false,
  isDestructive = false,
  destructiveConfirmText = 'Confirm Delete',
  onConfirmDestructive,
  isLoading = false,
}) => {
  const generatedId = useId();
  const titleId = `modal-title-${generatedId}`;
  const descId = `modal-desc-${generatedId}`;

  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Store trigger element focus and handle Escape key + focus trapping
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && !nonDismissible && !isLoading) {
          e.preventDefault();
          onClose();
        }

        // Focus trapping
        if (e.key === 'Tab' && modalRef.current) {
          const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
          );

          if (focusableElements.length === 0) return;

          const firstElement = focusableElements[0];
          const lastElement = focusableElements[focusableElements.length - 1];

          if (e.shiftKey) {
            if (document.activeElement === firstElement) {
              e.preventDefault();
              lastElement.focus();
            }
          } else {
            if (document.activeElement === lastElement) {
              e.preventDefault();
              firstElement.focus();
            }
          }
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';

      // Focus modal or first focusable child
      setTimeout(() => {
        if (modalRef.current) {
          const focusable = modalRef.current.querySelector<HTMLElement>(
            'input, button, select, textarea'
          );
          if (focusable) {
            focusable.focus();
          } else {
            modalRef.current.focus();
          }
        }
      }, 50);

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'unset';
        if (previousFocusRef.current) {
          previousFocusRef.current.focus();
        }
      };
    }
  }, [isOpen, nonDismissible, isLoading, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    default: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full m-4',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#172B2D]/50 backdrop-blur-xs transition-opacity animate-fadeIn"
        onClick={() => !nonDismissible && !isLoading && onClose()}
        aria-hidden="true"
      />

      {/* Modal Dialog Box */}
      <div
        ref={modalRef}
        tabIndex={-1}
        className={`relative w-full ${sizeClasses[size]} bg-white border border-[#DDE5E5] rounded-2xl shadow-xl z-10 flex flex-col max-h-[90vh] my-auto outline-none animate-scaleIn`}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between p-5 sm:p-6 border-b border-[#DDE5E5] shrink-0">
          <div className="space-y-1 pr-4">
            <div className="flex items-center gap-2.5">
              {isDestructive && (
                <div className="h-8 w-8 rounded-full bg-[#FDF2F2] text-[#C83C3C] flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-4 w-4" />
                </div>
              )}
              <h2 id={titleId} className="text-lg font-bold text-[#172B2D] leading-snug">
                {title}
              </h2>
            </div>
            {description && (
              <p id={descId} className="text-xs sm:text-sm text-[#5F6F71] leading-relaxed">
                {description}
              </p>
            )}
          </div>

          {!nonDismissible && (
            <IconButton
              icon={<X className="h-4 w-4" />}
              aria-label="Close dialog"
              variant="ghost"
              size="sm"
              disabled={isLoading}
              onClick={onClose}
            />
          )}
        </div>

        {/* Modal Body */}
        {children && (
          <div className="p-5 sm:p-6 overflow-y-auto flex-1 text-sm text-[#172B2D] space-y-4">
            {children}
          </div>
        )}

        {/* Modal Footer */}
        {(footer || isDestructive) && (
          <div className="flex items-center justify-end gap-3 p-4 sm:p-5 border-t border-[#DDE5E5] bg-[#F6F8F8] rounded-b-2xl shrink-0">
            {isDestructive ? (
              <>
                <Button variant="secondary" onClick={onClose} disabled={isLoading}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  isLoading={isLoading}
                  onClick={onConfirmDestructive}
                >
                  {destructiveConfirmText}
                </Button>
              </>
            ) : (
              footer
            )}
          </div>
        )}
      </div>
    </div>
  );
};
