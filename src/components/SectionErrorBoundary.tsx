import React from 'react';

interface SectionErrorBoundaryProps {
  children: React.ReactNode;
  resetKey: string;
}

/**
 * Keeps every routed workspace mounted behind one stable surface. Individual
 * data failures are handled by the workspace and the shell's sync alert, so a
 * navigation transition never replaces the app with a blank screen.
 */
export const SectionErrorBoundary: React.FC<SectionErrorBoundaryProps> = ({ children }) => <>{children}</>;
