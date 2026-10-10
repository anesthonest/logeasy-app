import React from 'react';
import { FlaskConical, LogOut, ShieldCheck, Sparkles, UserCheck } from 'lucide-react';
import { demoModeService, DEMO_PROFILE } from '../../core/demo/demo_mode_service';

interface DemonstrationBannerProps {
  onExitDemo: () => void;
}

export default function DemonstrationBanner({ onExitDemo }: DemonstrationBannerProps) {
  const isDemo = demoModeService.isEnabled();

  if (!isDemo) return null;

  return (
    <aside aria-label="Demonstration Mode Banner" className="w-full bg-gradient-to-r from-purple-950/90 via-indigo-950/90 to-blue-950/90 border-b border-indigo-500/30 px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs z-30 shadow-md">
      <div className="flex items-center gap-2.5">
        <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
          <FlaskConical className="h-4 w-4 text-indigo-300 animate-pulse" />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-gray-200">
          <span className="font-bold text-white uppercase font-mono text-[11px] tracking-wider flex items-center gap-1">
            🧪 Demonstration Mode
          </span>
          <span className="text-gray-300 text-[11px]">
            Exploring sample life model: <strong className="text-indigo-300">{DEMO_PROFILE.name}</strong> ({DEMO_PROFILE.role}).
          </span>
          <span className="text-[10px] text-emerald-400 font-medium hidden md:inline flex items-center gap-1">
            <ShieldCheck className="h-3 w-3 inline" /> Your personal vault remains 100% private and untouched.
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => {
            demoModeService.disableDemoMode();
            onExitDemo();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Exit to My Private Vault</span>
        </button>
      </div>
    </aside>
  );
}
