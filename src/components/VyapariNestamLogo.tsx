import React from 'react';

export type LogoVariant = 'full' | 'compact' | 'symbol';

interface VyapariNestamLogoProps {
  variant?: LogoVariant;
  className?: string;
  symbolClassName?: string;
  textClassName?: string;
  taglineClassName?: string;
  onClick?: () => void;
  showTagline?: boolean;
  lightText?: boolean;
}

export const VyapariNestamLogo: React.FC<VyapariNestamLogoProps> = ({
  variant = 'compact',
  className = '',
  symbolClassName = 'h-9 w-9',
  textClassName = 'text-slate-900',
  taglineClassName = 'text-slate-600',
  onClick,
  showTagline,
  lightText = false
}) => {
  // Should we show tagline? Default true for full, false for compact/symbol unless overridden
  const renderTagline = showTagline !== undefined ? showTagline : variant === 'full';

  return (
    <div 
      className={`inline-flex items-center gap-3 select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      {/* Symbol Component */}
      <div className={`relative shrink-0 flex items-center justify-center ${symbolClassName}`}>
        <svg 
          viewBox="0 0 500 500" 
          className="w-full h-full drop-shadow-2xs" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="vnT" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0B6E7B" />
              <stop offset="100%" stopColor="#155E75" />
            </linearGradient>
            <linearGradient id="vnO" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#D97706" />
              <stop offset="50%" stopColor="#EA580C" />
              <stop offset="100%" stopColor="#F97316" />
            </linearGradient>
            <linearGradient id="vnG" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#15803D" />
              <stop offset="100%" stopColor="#22C55E" />
            </linearGradient>
            <linearGradient id="vnAu" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#D97706" />
            </linearGradient>
          </defs>

          {/* Buildings */}
          <path d="M 222 118 L 222 55 C 222 52, 226 50, 230 50 L 244 50 C 248 50, 252 52, 252 55 L 252 118 Z" fill="url(#vnT)"/>
          <rect x="230" y="60" width="6" height="8" rx="1" fill="#FFFFFF" opacity="0.85"/>
          <rect x="238" y="60" width="6" height="8" rx="1" fill="#FFFFFF" opacity="0.85"/>
          <rect x="230" y="74" width="6" height="8" rx="1" fill="#FFFFFF" opacity="0.85"/>
          <rect x="238" y="74" width="6" height="8" rx="1" fill="#FFFFFF" opacity="0.85"/>

          <path d="M 250 118 L 250 35 C 250 31, 255 28, 260 28 L 276 28 C 281 28, 286 31, 286 35 L 286 118 Z" fill="url(#vnAu)"/>
          <rect x="258" y="38" width="6" height="8" rx="1" fill="#FFFFFF" opacity="0.9"/>
          <rect x="268" y="38" width="6" height="8" rx="1" fill="#FFFFFF" opacity="0.9"/>
          <rect x="258" y="52" width="6" height="8" rx="1" fill="#FFFFFF" opacity="0.9"/>
          <rect x="268" y="52" width="6" height="8" rx="1" fill="#FFFFFF" opacity="0.9"/>

          <path d="M 284 118 L 284 52 C 284 48, 288 45, 292 45 L 306 45 C 310 45, 314 48, 314 52 L 314 118 Z" fill="url(#vnO)"/>
          <rect x="291" y="56" width="6" height="8" rx="1" fill="#FFFFFF" opacity="0.85"/>
          <rect x="299" y="56" width="6" height="8" rx="1" fill="#FFFFFF" opacity="0.85"/>

          {/* Heart Canvas & Ribbons */}
          <path d="M 250 118 C 210 70, 160 90, 160 155 C 160 215, 205 270, 250 315 C 295 270, 340 215, 340 155 C 340 90, 290 70, 250 118 Z" fill="#FFFFFF" />
          <path d="M 250 118 C 200 60, 140 85, 140 160 C 140 235, 195 295, 250 340 C 230 310, 162 250, 162 165 C 162 108, 208 85, 250 128 Z" fill="url(#vnT)" />
          <path d="M 250 340 C 290 310, 335 265, 350 205 C 358 175, 348 150, 335 155 C 320 160, 318 190, 295 235 C 275 275, 250 300, 230 315 C 210 290, 180 260, 155 240 C 145 232, 138 250, 150 265 C 175 295, 215 325, 250 340 Z" fill="url(#vnO)" />

          {/* Sector Icons inside Heart */}
          {/* Medical Cross */}
          <g transform="translate(185, 150)">
            <rect x="12" y="4" width="8" height="24" rx="2" fill="#0B6E7B" />
            <rect x="4" y="12" width="24" height="8" rx="2" fill="#0B6E7B" />
          </g>
          {/* Shopping Cart */}
          <g transform="translate(280, 152)">
            <path d="M 2 4 L 8 4 L 12 20 L 28 20 L 32 8 L 10 8" fill="none" stroke="#EA580C" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="14" cy="25" r="2.5" fill="#EA580C" />
            <circle cx="26" cy="25" r="2.5" fill="#EA580C" />
          </g>
          {/* Open Book */}
          <g transform="translate(190, 230)">
            <path d="M 16 6 C 11 3, 4 4, 2 6 L 2 22 C 4 20, 11 19, 16 22 C 21 19, 28 20, 30 22 L 30 6 C 28 4, 21 3, 16 6 Z" fill="none" stroke="#0B6E7B" strokeWidth="2.5" strokeLinejoin="round"/>
          </g>
          {/* Dumbbell */}
          <g transform="translate(272, 222) rotate(-30, 16, 16)">
            <line x1="10" y1="16" x2="22" y2="16" stroke="#0B6E7B" strokeWidth="4" strokeLinecap="round"/>
            <rect x="2" y="8" width="5" height="16" rx="2" fill="#0B6E7B"/>
            <rect x="25" y="8" width="5" height="16" rx="2" fill="#0B6E7B"/>
          </g>

          {/* Green Growth Trend Arrow */}
          <path d="M 155 240 L 210 200 L 245 228 L 285 155 L 305 168 L 330 110" fill="none" stroke="url(#vnG)" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M 310 100 L 350 100 L 340 140 Z" fill="url(#vnG)" />
        </svg>
      </div>

      {/* Brand Text & Tagline (if not symbol-only) */}
      {variant !== 'symbol' && (
        <div className="flex flex-col justify-center leading-none">
          <div className={`font-black tracking-wider uppercase font-display flex items-center gap-1.5 ${textClassName}`}>
            <span className={lightText ? 'text-white' : 'text-[#0F4C5C]'}>Vyapari</span>
            <span className={lightText ? 'text-teal-300' : 'text-[#0B6E7B]'}>Nestam</span>
          </div>
          {renderTagline && (
            <div className={`text-[10px] sm:text-[11px] font-bold tracking-wider uppercase mt-1 ${taglineClassName}`}>
              Your Business Friend. Your Growth Partner.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
