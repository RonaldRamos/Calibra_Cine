import React from 'react';

interface CalibraCineLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  className?: string;
  iconOnly?: boolean;
}

export const CalibraCineLogo: React.FC<CalibraCineLogoProps> = ({
  size = 'md',
  showTagline = false,
  className = '',
  iconOnly = false,
}) => {
  const sizeMap = {
    sm: { icon: 'w-7 h-7', title: 'text-base', tagline: 'text-[8px]' },
    md: { icon: 'w-9 h-9', title: 'text-xl', tagline: 'text-[9px]' },
    lg: { icon: 'w-12 h-12', title: 'text-2xl', tagline: 'text-[11px]' },
    xl: { icon: 'w-16 h-16', title: 'text-3xl', tagline: 'text-xs' },
  };

  const currentSize = sizeMap[size];

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Brand Icon Badge with Pure Inline Vector Emblem */}
      <div className={`${currentSize.icon} relative shrink-0 flex items-center justify-center rounded-xl bg-slate-950 p-1 border border-slate-800 shadow-md shadow-amber-500/10`}>
        <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="silverGradLogo" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff"/>
              <stop offset="50%" stopColor="#cbd5e1"/>
              <stop offset="100%" stopColor="#64748b"/>
            </linearGradient>
            <linearGradient id="goldBeamLogo" x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.95"/>
              <stop offset="100%" stopColor="#d97706" stopOpacity="0"/>
            </linearGradient>
            <radialGradient id="lensGlassLogo" cx="40%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#60a5fa"/>
              <stop offset="50%" stopColor="#2563eb"/>
              <stop offset="100%" stopColor="#020617"/>
            </radialGradient>
          </defs>
          {/* Projection Beam */}
          <polygon points="50,50 88,32 88,68" fill="url(#goldBeamLogo)" />
          {/* Outer C-Aperture Ring */}
          <path
            d="M 68,36 A 28,28 0 1,0 68,64 L 56,58 A 16,16 0 1,1 56,42 Z"
            fill="url(#silverGradLogo)"
            stroke="#ffffff"
            strokeWidth="0.8"
          />
          {/* Sprocket Holes */}
          <rect x="38" y="38" width="3" height="4" rx="0.5" fill="#020617" />
          <rect x="36" y="48" width="3" height="4" rx="0.5" fill="#020617" />
          <rect x="38" y="58" width="3" height="4" rx="0.5" fill="#020617" />
          {/* Inner Lens Glass */}
          <circle cx="50" cy="50" r="13" fill="url(#lensGlassLogo)" stroke="#3b82f6" strokeWidth="0.8" />
          <circle cx="50" cy="50" r="6" fill="none" stroke="#bfdbfe" strokeWidth="0.8" opacity="0.8" />
          <circle cx="48" cy="48" r="2" fill="#ffffff" opacity="0.9" />
        </svg>
      </div>

      {!iconOnly && (
        <div className="flex flex-col">
          <div className={`font-black tracking-tight leading-none ${currentSize.title} flex items-center`}>
            <span className="text-white">Calibra</span>
            <span className="text-amber-500">Cine</span>
          </div>
          {showTagline && (
            <span className={`font-extrabold tracking-widest uppercase text-slate-400 mt-1 ${currentSize.tagline}`}>
              GESTÃO TÉCNICA DE CINEMA DIGITAL
            </span>
          )}
        </div>
      )}
    </div>
  );
};
