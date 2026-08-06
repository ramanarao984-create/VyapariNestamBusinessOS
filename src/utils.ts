/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Bulletproof helper to write text to clipboard in modern web apps,
 * especially useful inside sandboxed iframes.
 */
export const safeCopyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn('[Clipboard] navigator.clipboard failed, trying selection fallback:', err);
  }

  // Fallback for older browsers or sandboxed iframes
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.left = '0';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textarea);
    return successful;
  } catch (err) {
    console.error('[Clipboard] Fallback clipboard copy failed:', err);
    return false;
  }
};

/**
 * Standard format for currency (Indian Rupee INR)
 */
export const formatRupees = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};
