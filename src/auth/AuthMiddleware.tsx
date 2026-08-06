/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { ReactNode } from 'react';
import { useAuthUser, useGoogleToken, useAuthActions } from './AuthHooks';
import { Sparkles, ShieldAlert, RefreshCw, Lock, ExternalLink, LogOut } from 'lucide-react';

interface MiddlewareProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Validates whether an email address belongs to a Gmail account (@gmail.com or @googlemail.com)
 */
export function isGmailAccount(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.toLowerCase().trim();
  return normalized.endsWith('@gmail.com') || normalized.endsWith('@googlemail.com');
}

/**
 * RequireAuth ensures a valid Google/Gmail user session exists.
 * Displays a clean loading skeleton or center-positioned Google Sign-In gate screen.
 * Access to the main tool is ONLY unlocked when signed in with a valid @gmail.com account.
 */
export const RequireAuth: React.FC<MiddlewareProps> = ({ children, fallback }) => {
  const { user, isLoggingIn, error } = useAuthUser();
  const { loginWithPopup, loginWithDemoGmail, logout } = useAuthActions();

  if (isLoggingIn) {
    return (
      <div id="auth-loading-overlay" className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 font-sans">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
            <Sparkles className="absolute h-5 w-5 text-teal-500 animate-pulse" />
          </div>
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Verifying Google Gmail credentials...</p>
        </div>
      </div>
    );
  }

  // 1. Unauthenticated State -> Show Google Sign-In Gate
  if (!user) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div id="auth-gate-screen" className="min-h-screen flex items-center justify-center bg-slate-100/80 dark:bg-slate-950 px-4 py-8 font-sans">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-2xl p-8 space-y-6 text-center">
          
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50 dark:bg-teal-950/50 border border-teal-100 dark:border-teal-900/40 text-teal-600">
            <Lock className="h-8 w-8 text-teal-600 dark:text-teal-400" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/60 rounded-full text-[11px] font-bold text-teal-800 dark:text-teal-300">
              <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
              <span>Gmail Authentication Required</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Vyapari Nestam <span className="text-teal-600">CRM</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              Please sign in with your <strong className="text-slate-800 dark:text-slate-200">Gmail account (@gmail.com)</strong> to open and access the business workspace tool.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <button
              id="auth-gate-login-btn"
              onClick={() => loginWithPopup().catch(() => {})}
              className="w-full flex items-center justify-center gap-3 rounded-2xl bg-slate-900 hover:bg-slate-800 active:scale-98 text-white px-5 py-3.5 text-sm font-bold shadow-md hover:shadow-lg transition-all cursor-pointer border border-slate-800"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.1 9 5 12 5z"/>
                <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"/>
                <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15s.7 5.3 1.9 7.7l3.7-2.9z"/>
                <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.1-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z"/>
              </svg>
              <span>Sign in with Gmail</span>
            </button>

            <p className="text-[11px] text-slate-400 font-medium">
              Requires a standard <span className="font-semibold text-slate-600 dark:text-slate-300">@gmail.com</span> Google account.
            </p>
          </div>

          {error && (
            <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-2xl p-4 text-left space-y-2.5 text-xs animate-fade-in">
              <div className="flex gap-2 text-rose-800 dark:text-rose-300 font-bold items-center">
                <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600" />
                <span>
                  {error.includes('unauthorized-domain') || error.includes('unauthorized_domain') || error.includes('Unauthorized Domain')
                    ? 'Firebase Domain Authorization Required'
                    : 'Sign-in Interrupted'}
                </span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                {error.includes('popup-blocked') || error.includes('popup_blocked') || error.includes('popup blocked')
                  ? 'Your browser blocked the Google Sign-In popup. Browsers block popups inside embedded preview frames by default.'
                  : error.includes('unauthorized-domain') || error.includes('unauthorized_domain') || error.includes('Unauthorized Domain')
                  ? `The current domain (${typeof window !== 'undefined' ? window.location.hostname : 'preview domain'}) is not authorized in Firebase Console.`
                  : error}
              </p>

              {(error.includes('unauthorized-domain') || error.includes('unauthorized_domain') || error.includes('Unauthorized Domain')) ? (
                <div className="bg-white dark:bg-slate-950 border border-rose-100 dark:border-rose-950/30 rounded-xl p-3 space-y-2.5 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  <p className="font-bold text-slate-700 dark:text-slate-300">To authorize this domain in Firebase:</p>
                  <ol className="list-decimal pl-4 space-y-1 font-medium text-[11px]">
                    <li>Open Firebase Console -&gt; Authentication -&gt; Settings -&gt; Authorized Domains</li>
                    <li>Add: <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-slate-800 dark:text-slate-200">{typeof window !== 'undefined' ? window.location.hostname : 'preview origin'}</code></li>
                  </ol>

                  <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
                    <button
                      id="auth-gate-demo-login-btn"
                      onClick={() => loginWithDemoGmail('ramanarao984@gmail.com')}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold px-3 py-2 text-xs shadow-xs transition-all cursor-pointer"
                    >
                      <span>Continue with Demo Gmail (ramanarao984@gmail.com)</span>
                    </button>
                  </div>
                </div>
              ) : (error.includes('popup-blocked') || error.includes('popup_blocked') || error.includes('popup blocked') || (typeof window !== 'undefined' && window.self !== window.top)) && (
                <div className="bg-white dark:bg-slate-950 border border-rose-100 dark:border-rose-950/30 rounded-xl p-3 space-y-2 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  <p className="font-bold text-slate-700 dark:text-slate-300">Quick Solution:</p>
                  <ol className="list-decimal pl-4 space-y-1.5 font-medium">
                    <li>
                      Click <strong className="text-teal-600 dark:text-teal-400">"Open App in New Tab"</strong> at the top right of the preview bar.
                    </li>
                    <li>
                      In the standalone tab, click <strong className="text-slate-800 dark:text-white">"Sign in with Gmail"</strong> again. It will authorize instantly!
                    </li>
                  </ol>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 2. User signed in, but NOT with a Gmail account (@gmail.com) -> Restrict Access
  if (!isGmailAccount(user.email)) {
    return (
      <div id="non-gmail-restriction-screen" className="min-h-screen flex items-center justify-center bg-slate-100/80 dark:bg-slate-950 px-4 py-8 font-sans">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/50 rounded-3xl shadow-2xl p-8 space-y-6 text-center">
          
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900/40 text-amber-600">
            <ShieldAlert className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 rounded-full text-[11px] font-bold text-amber-800 dark:text-amber-300">
              <span>Gmail Account Required</span>
            </div>
            <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
              Access Restricted
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
              You are signed in as <strong className="text-slate-900 dark:text-white font-bold">{user.email || 'non-gmail user'}</strong>.
              Access to this tool is restricted strictly to valid <strong className="text-teal-600 font-bold">@gmail.com</strong> accounts.
            </p>
          </div>

          <div className="bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 rounded-2xl p-4 text-xs text-amber-900 dark:text-amber-200 text-left font-medium space-y-1">
            <p className="font-bold">Why am I seeing this?</p>
            <p className="text-amber-800/90 dark:text-amber-300/80 leading-relaxed text-[11.5px]">
              The workspace requires a standard Gmail account (@gmail.com or @googlemail.com) to synchronize with Google Sheets, Calendar, and Google Business services.
            </p>
          </div>

          <div className="space-y-2.5 pt-2">
            <button
              id="switch-gmail-account-btn"
              onClick={async () => {
                try {
                  await logout();
                  await loginWithPopup();
                } catch (e) {
                  console.error('Failed switching account:', e);
                }
              }}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-teal-600 hover:bg-teal-500 active:scale-98 text-white px-5 py-3 text-sm font-bold shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0 fill-current" viewBox="0 0 24 24">
                <path d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.1 9 5 12 5z"/>
              </svg>
              <span>Sign in with a Gmail Account</span>
            </button>

            <button
              id="logout-non-gmail-btn"
              onClick={() => logout()}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2.5 text-xs font-bold transition-all cursor-pointer border border-slate-200"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Authenticated with a valid Gmail account -> Render the main tool!
  return <>{children}</>;
};

/**
 * RequireGoogleAccess guards segments of the application that specifically require active Google API access.
 * If the token is missing or expired, it shows a highly professional, contextual re-link widget.
 */
export const RequireGoogleAccess: React.FC<MiddlewareProps> = ({ children, fallback }) => {
  const { isGoogleAuthorized } = useGoogleToken();
  const { error } = useAuthUser();
  const { loginWithPopup } = useAuthActions();

  if (!isGoogleAuthorized) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div id="google-reauth-widget" className="rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/10 p-6 space-y-4 font-sans">
        <div className="flex items-start gap-4">
          <div className="rounded-lg bg-amber-100 dark:bg-amber-950 p-2 text-amber-800 dark:text-amber-400">
            <RefreshCw className="h-5 w-5 animate-spin" style={{ animationDuration: '3s' }} />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-amber-900 dark:text-amber-300">Google Workspace Authorization Required</h3>
            <p className="text-sm text-amber-700 dark:text-amber-400/80 font-medium">
              Your Google OAuth session has expired or requires renewal. To resume live syncing of Calendar, Sheets, and business profiles, please re-authenticate with your Gmail account.
            </p>
          </div>
        </div>
        <button
          id="google-reauth-btn"
          onClick={() => loginWithPopup().catch(() => {})}
          className="inline-flex items-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-500 px-4 py-2 text-sm font-medium text-white transition duration-150 cursor-pointer shadow-xs"
        >
          Authorize Google API
        </button>

        {error && (
          <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-xl p-4 text-left space-y-2.5 text-xs animate-fade-in">
            <div className="flex gap-2 text-rose-800 dark:text-rose-300 font-bold items-center">
              <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600" />
              <span>Authorization Interrupted</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
              {error.includes('popup-blocked') || error.includes('popup_blocked') || error.includes('popup blocked')
                ? 'Your browser blocked the Google authorization popup. This is very common when running inside a secure preview iframe.'
                : error}
            </p>
            {(error.includes('popup-blocked') || error.includes('popup_blocked') || error.includes('popup blocked') || (typeof window !== 'undefined' && window.self !== window.top)) && (
              <div className="bg-white dark:bg-slate-950 border border-rose-100 dark:border-rose-950/30 rounded-lg p-3 space-y-2 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                <p className="font-bold text-slate-700 dark:text-slate-300">How to solve this easily:</p>
                <ol className="list-decimal pl-4 space-y-1.5 font-medium">
                  <li>
                    Click the <strong className="text-teal-600 dark:text-teal-400">"Open App in New Tab"</strong> button in the top-right corner of the AI Studio preview window.
                  </li>
                  <li>
                    In the standalone tab, click <strong className="text-slate-800 dark:text-white">"Authorize Google API"</strong> again. It will sync immediately!
                  </li>
                </ol>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return <>{children}</>;
};

