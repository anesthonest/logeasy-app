import React from 'react';

export interface LogEasyLogoProps {
  /** Size variant or numerical pixel dimensions for the icon */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | number;
  /** Display variant: icon only, full horizontal lockup, or stacked hero */
  variant?: 'icon' | 'full' | 'hero';
  /** Show subtle product badge (e.g. HIOS or Personal Human Intelligence OS) */
  badge?: string | boolean;
  /** Subtitle to show under the brand name (for hero/full) */
  subtitle?: string | boolean;
  /** Custom additional CSS classes for container */
  className?: string;
  /** Animate subtle pulse/glow on hover or state */
  animated?: boolean;
  /** Click handler if logo acts as home button */
  onClick?: () => void;
}

const SIZE_MAP = {
  xs: { icon: 18, text: 'text-sm', badge: 'text-[8px]' },
  sm: { icon: 22, text: 'text-base', badge: 'text-[9px]' },
  md: { icon: 28, text: 'text-lg', badge: 'text-[10px]' },
  lg: { icon: 36, text: 'text-xl', badge: 'text-[11px]' },
  xl: { icon: 48, text: 'text-2xl', badge: 'text-xs' },
  '2xl': { icon: 64, text: 'text-3xl', badge: 'text-sm' },
};

export const LogEasyLogo: React.FC<LogEasyLogoProps> = ({
  size = 'md',
  variant = 'icon',
  badge = false,
  subtitle = false,
  className = '',
  animated = false,
  onClick,
}) => {
  const pixelSize = typeof size === 'number' ? size : SIZE_MAP[size]?.icon || 28;
  const sizeConfig = typeof size === 'string' ? SIZE_MAP[size] : { icon: size, text: 'text-lg', badge: 'text-[10px]' };

  // SVG Mark: Bespoke LogEasy Emblem (Dual Continuous Radiant Wave & Human Synapse Node)
  const LogoMark = (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 ${
        animated ? 'group-hover:scale-105 transition-transform duration-300' : ''
      }`}
      style={{ width: pixelSize, height: pixelSize }}
    >
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_2px_10px_rgba(6,182,212,0.35)]"
      >
        <defs>
          {/* Gradient 1: Primary Radiant Flow (Cyan to Violet) */}
          <linearGradient id="logeasyGradPrimary" x1="4" y1="6" x2="44" y2="42" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#22D3EE" />
            <stop offset="45%" stopColor="#06B6D4" />
            <stop offset="80%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#A855F7" />
          </linearGradient>

          {/* Gradient 2: Harmonic Soundwave Arc */}
          <linearGradient id="logeasyGradHarmonic" x1="12" y1="14" x2="36" y2="34" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#818CF8" stopOpacity="0.4" />
          </linearGradient>

          {/* Core Synapse Radial Glow */}
          <radialGradient id="logeasySynapseGlow" cx="24" cy="24" r="12" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#E0F2FE" stopOpacity="1" />
            <stop offset="40%" stopColor="#38BDF8" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#06B6D4" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Outer Continuous Infinity Ring / Sound Crest */}
        <path
          d="M 14 36 C 8 36 6 30 6 24 C 6 15 14 8 24 8 C 34 8 42 15 42 24 C 42 32 35 38 27 38 C 21 38 18 34 18 29 C 18 21 24 16 31 16 C 36 16 38 19 38 22"
          stroke="url(#logeasyGradPrimary)"
          strokeWidth="3.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Harmonic Voice Resonance Wave 1 */}
        <path
          d="M 12 24 C 12 20 15 17 19 17 C 23 17 25 20 25 24 C 25 28 27 31 31 31"
          stroke="url(#logeasyGradHarmonic)"
          strokeWidth="2.4"
          strokeLinecap="round"
        />

        {/* Synapse Pulse / Central Memory Core */}
        <circle cx="24" cy="24" r="3.2" fill="url(#logeasySynapseGlow)" />
        <circle cx="24" cy="24" r="1.6" fill="#FFFFFF" />

        {/* Subtle Satellite Insight Node */}
        <circle cx="34" cy="14" r="1.8" fill="#A855F7" />
        <circle cx="14" cy="34" r="1.4" fill="#22D3EE" />
      </svg>
    </div>
  );

  if (variant === 'icon') {
    return (
      <div
        onClick={onClick}
        className={`inline-flex items-center justify-center ${onClick ? 'cursor-pointer' : ''} ${className}`}
      >
        {LogoMark}
      </div>
    );
  }

  const badgeText = typeof badge === 'string' ? badge : 'HIOS';
  const subText =
    typeof subtitle === 'string'
      ? subtitle
      : 'Personal Human Intelligence Operating System';

  if (variant === 'hero') {
    return (
      <div
        onClick={onClick}
        className={`flex flex-col items-center text-center select-none ${
          onClick ? 'cursor-pointer' : ''
        } ${className}`}
      >
        <div className="relative mb-3 sm:mb-4">
          <div className="absolute inset-0 rounded-full bg-cyan-500/20 blur-xl animate-pulse -z-10" />
          <div className="p-3 sm:p-4 rounded-3xl bg-[#0b1220]/80 border border-cyan-500/30 backdrop-blur-md shadow-2xl">
            {LogoMark}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-2xl sm:text-3xl font-black tracking-tight text-white font-sans">
            LogEasy
          </span>
          {badge && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-bold uppercase tracking-wider">
              {badgeText}
            </span>
          )}
        </div>

        {subtitle && (
          <p className="text-xs sm:text-sm text-gray-400 mt-1 max-w-sm font-normal">
            {subText}
          </p>
        )}
      </div>
    );
  }

  // Horizontal Full Brand Lockup
  return (
    <div
      onClick={onClick}
      className={`group flex items-center gap-2.5 select-none ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
    >
      <div className="p-1 sm:p-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center shrink-0">
        {LogoMark}
      </div>

      <div className="flex flex-col justify-center min-w-0">
        <div className="flex items-center gap-1.5 leading-tight">
          <span
            className={`font-black tracking-tight text-white group-hover:text-cyan-300 transition-colors ${sizeConfig.text}`}
          >
            LogEasy
          </span>
          {badge && (
            <span
              className={`hidden sm:inline-flex px-1.5 py-0.5 rounded text-cyan-400/90 font-mono tracking-wider border border-cyan-500/25 bg-cyan-500/10 font-bold uppercase ${sizeConfig.badge}`}
            >
              {badgeText}
            </span>
          )}
        </div>

        {subtitle && (
          <span className="text-[10px] text-gray-400 font-medium truncate max-w-[200px] hidden md:block">
            {subText}
          </span>
        )}
      </div>
    </div>
  );
};

export default LogEasyLogo;
