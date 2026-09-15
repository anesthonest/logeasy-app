import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, Lock, Bell, Sliders, Cpu, Settings, RefreshCw, Terminal, Gem, ShieldAlert,
  ChevronRight, ArrowLeft, CheckCircle, HelpCircle, HardDrive, Shield
} from 'lucide-react';
import { AppSettings, settingsProvider } from '../../features/settings/settings_provider';
import { AuthSession } from '../../features/auth/auth_service';
import { SyncStatus } from '../../core/sync/sync_engine';

import SecurityPrivacyDashboard from './SecurityPrivacyDashboard';
import MonetizationDashboard from './MonetizationDashboard';
import AIIntelligenceDashboard from './AIIntelligenceDashboard';
import { AdminConsole } from '../admin/AdminConsole';

interface ProfileSettingsConsoleProps {
  userId: string;
  session: AuthSession;
  settings: AppSettings;
  syncState: SyncStatus;
  devModeActive: boolean;
  onToggleDevMode: (active: boolean) => void;
  onLogout: () => void;
  onOpenAuth: () => void;
  renderAuthPanel: () => React.ReactNode;
  renderDatabasePanel: () => React.ReactNode;
  renderDiagnosticsPanel: () => React.ReactNode;
}

export default function ProfileSettingsConsole({
  userId,
  session,
  settings,
  syncState,
  devModeActive,
  onToggleDevMode,
  onLogout,
  onOpenAuth,
  renderAuthPanel,
  renderDatabasePanel,
  renderDiagnosticsPanel
}: ProfileSettingsConsoleProps) {
  
  // We can track the active subscreen internally using a simple local state!
  // This is highly modular and prevents tab bleeding.
  const [activeSubScreen, setActiveSubScreen] = useState<'menu' | 'auth' | 'security' | 'monetization' | 'database' | 'ai_sandbox' | 'admin' | 'diagnostics'>('menu');

  // Helpers
  const handleUpdateTheme = (theme: 'light' | 'dark' | 'system') => {
    settingsProvider.updateSettings({ theme });
  };

  const handleUpdateLanguage = (language: 'en' | 'es' | 'de' | 'fr') => {
    settingsProvider.updateSettings({ language });
  };

  const handleUpdateAccessibility = (key: 'largeText' | 'highContrast' | 'screenReaderSimulation', value: boolean) => {
    settingsProvider.updateSettings({
      accessibility: {
        ...settings.accessibility,
        [key]: value
      }
    });
  };

  const menuItems = [
    {
      id: 'auth',
      title: 'Secure Vault Authentication',
      desc: session.isAuthenticated ? `Connected as ${session.user?.displayName || 'User'}` : 'Decrypted device caching keys & connect cloud vault',
      icon: User,
      color: 'text-cyan-400',
      badge: session.isAuthenticated ? 'Connected' : 'Offline / Guest',
      badgeColor: session.isAuthenticated ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400',
    },
    {
      id: 'security',
      title: 'Privacy & Secure Biometrics',
      desc: 'Symmetrical database salts, AES encryption toggles, forced integrity audit',
      icon: Lock,
      color: 'text-indigo-400',
    },
    {
      id: 'monetization',
      title: 'Premium Licensing & Achievements',
      desc: 'Active subscriber vaults, referral tracking logs, reward milestones',
      icon: Gem,
      color: 'text-amber-400',
    },
    {
      id: 'database',
      title: 'Disaster Recovery Snapshots',
      desc: 'IndexedDB storage diagnostics, background sync timers, manual queue sync',
      icon: HardDrive,
      color: 'text-emerald-400',
    },
  ];

  if (activeSubScreen !== 'menu') {
    return (
      <div className="space-y-6 max-w-4xl mx-auto pb-10">
        <button
          onClick={() => setActiveSubScreen('menu')}
          className="flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-white transition-all cursor-pointer border border-gray-800 px-4 py-2 rounded-2xl bg-gray-500/5 hover:bg-gray-500/10"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Profile & Settings</span>
        </button>

        <div className="p-1 rounded-3xl border border-gray-500/10 bg-gray-500/[0.01]">
          {activeSubScreen === 'auth' && renderAuthPanel()}
          {activeSubScreen === 'security' && <SecurityPrivacyDashboard userId={userId} />}
          {activeSubScreen === 'monetization' && <MonetizationDashboard userId={userId} />}
          {activeSubScreen === 'database' && renderDatabasePanel()}
          {activeSubScreen === 'ai_sandbox' && <AIIntelligenceDashboard userId={userId} />}
          {activeSubScreen === 'admin' && <AdminConsole userId={userId} />}
          {activeSubScreen === 'diagnostics' && renderDiagnosticsPanel()}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-10">
      
      {/* PROFILE HEADER */}
      <div className="flex items-center gap-4 p-6 rounded-3xl bg-gray-500/5 border border-gray-500/10">
        <div className="h-14 w-14 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-500 flex items-center justify-center text-white text-lg font-black select-none shadow-md shadow-cyan-950/20">
          {session.user?.displayName ? session.user.displayName.charAt(0).toUpperCase() : 'G'}
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold">{session.user?.displayName || 'Guest Reflection Vault'}</h2>
          <p className="text-xs text-gray-400 font-mono">UID: {session.user?.uid || 'guest_user'}</p>
          <p className="text-[11px] text-gray-500">
            {session.isAuthenticated ? '🔒 Symmetrical on-device encryption + Cloud Synced' : '🔒 Offline local-storage encryption only'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* LEFT COLUMN: CATEGORIES LIST */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 font-mono">Vault Preferences</h3>
          
          <div className="space-y-3">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  onClick={() => setActiveSubScreen(item.id as any)}
                  className="p-4 rounded-2xl bg-gray-500/5 border border-gray-500/10 hover:border-cyan-500/20 hover:bg-gray-500/10 transition-all cursor-pointer flex items-center justify-between gap-4 group"
                >
                  <div className="flex items-start gap-3.5">
                    <div className={`p-2 rounded-xl bg-gray-500/5 border border-gray-500/10 group-hover:scale-110 transition-transform ${item.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-gray-200 group-hover:text-cyan-400 transition-colors">{item.title}</h4>
                        {item.badge && (
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-mono uppercase font-bold ${item.badgeColor}`}>
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-400 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-600 group-hover:text-gray-300 transition-colors" />
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: CORE PREFERENCES (THEME, LANGUAGE, ACCESSIBILITY) */}
        <div className="space-y-6">
          
          <div className="p-5 rounded-3xl bg-gray-500/5 border border-gray-500/10 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 font-mono flex items-center gap-2">
              <Sliders className="h-4 w-4 text-cyan-400" />
              <span>Appearance & Localization</span>
            </h3>

            <div className="space-y-3.5 text-xs">
              
              {/* Theme Selector */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-gray-200 block">System Visual Theme</span>
                  <span className="text-[11px] text-gray-400">Change application layout mode</span>
                </div>
                <select 
                  value={settings.theme}
                  onChange={(e) => handleUpdateTheme(e.target.value as any)}
                  className="bg-gray-500/10 border border-gray-500/20 rounded-xl px-3 py-1.5 text-xs text-gray-200 outline-none cursor-pointer hover:bg-gray-500/20"
                >
                  <option value="light">Light Slate Mode</option>
                  <option value="dark">Dark Charcoal Vault</option>
                  <option value="system">Match System</option>
                </select>
              </div>

              {/* Language Selector */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-gray-200 block">Localization Language</span>
                  <span className="text-[11px] text-gray-400">Change translation settings</span>
                </div>
                <select 
                  value={settings.language}
                  onChange={(e) => handleUpdateLanguage(e.target.value as any)}
                  className="bg-gray-500/10 border border-gray-500/20 rounded-xl px-3 py-1.5 text-xs text-gray-200 outline-none cursor-pointer hover:bg-gray-500/20"
                >
                  <option value="en">English (US)</option>
                  <option value="es">Español (ES)</option>
                  <option value="de">Deutsch (DE)</option>
                  <option value="fr">Français (FR)</option>
                </select>
              </div>

              {/* Push notifications */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-gray-200 block">Daily Reminders Alerts</span>
                  <span className="text-[11px] text-gray-400">Get daily quiet reflection prompts</span>
                </div>
                <input 
                  type="checkbox"
                  checked={settings.notificationsEnabled}
                  onChange={(e) => settingsProvider.updateSettings({ notificationsEnabled: e.target.checked })}
                  className="accent-cyan-400 h-4.5 w-4.5 cursor-pointer"
                />
              </div>

            </div>
          </div>

          <div className="p-5 rounded-3xl bg-gray-500/5 border border-gray-500/10 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 font-mono flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-indigo-400" />
              <span>Accessibility Toggles</span>
            </h3>

            <div className="space-y-3.5 text-xs">
              
              {/* Large Text */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-gray-200 block">Large Text Sizing</span>
                  <span className="text-[11px] text-gray-400">Increases base paragraph sizing</span>
                </div>
                <input 
                  type="checkbox"
                  checked={settings.accessibility.largeText}
                  onChange={(e) => handleUpdateAccessibility('largeText', e.target.checked)}
                  className="accent-indigo-400 h-4.5 w-4.5 cursor-pointer"
                />
              </div>

              {/* High Contrast */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-gray-200 block">Stark High Contrast</span>
                  <span className="text-[11px] text-gray-400">Enhance background color contrasts</span>
                </div>
                <input 
                  type="checkbox"
                  checked={settings.accessibility.highContrast}
                  onChange={(e) => handleUpdateAccessibility('highContrast', e.target.checked)}
                  className="accent-indigo-400 h-4.5 w-4.5 cursor-pointer"
                />
              </div>

              {/* Screen reader simulator */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-gray-200 block">Hover Speech Synthesis</span>
                  <span className="text-[11px] text-gray-400">Speaks hovered button items out loud</span>
                </div>
                <input 
                  type="checkbox"
                  checked={settings.accessibility.screenReaderSimulation}
                  onChange={(e) => handleUpdateAccessibility('screenReaderSimulation', e.target.checked)}
                  className="accent-indigo-400 h-4.5 w-4.5 cursor-pointer"
                />
              </div>

            </div>
          </div>

        </div>

      </div>

      {/* ADVANCED DEVELOPER SETTINGS (ACCORDION TOGGLER) */}
      <div className="p-6 rounded-3xl bg-[#090d19]/40 border border-gray-800 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="space-y-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-500 font-mono flex items-center gap-2">
              <ShieldAlert className="h-4.5 w-4.5 animate-pulse" />
              <span>Advanced Developer Hub & Logs Console</span>
            </h3>
            <p className="text-[11px] text-gray-400">
              Unlock core diagnostics, IndexedDB inspectors, AI prompt testers, and administrative tools.
            </p>
          </div>
          
          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input 
              type="checkbox" 
              checked={devModeActive}
              onChange={(e) => {
                onToggleDevMode(e.target.checked);
                localStorage.setItem('logeasy_dev_mode', e.target.checked ? 'true' : 'false');
              }}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 after:border-gray-300 after:border after:rounded-full after:h-5 after:width-5 after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-amber-500 peer-checked:after:bg-white"></div>
          </label>
        </div>

        {/* DEVELOPER TOOLS (EXPANDED OPTION LIST) */}
        {devModeActive && (
          <div className="pt-4 border-t border-gray-800 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              onClick={() => setActiveSubScreen('diagnostics')}
              className="p-3 text-center border border-amber-500/20 hover:border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10 rounded-2xl transition-all cursor-pointer space-y-1.5"
            >
              <Sliders className="h-4 w-4 text-amber-400 mx-auto" />
              <span className="text-[10px] font-bold text-amber-400 block font-mono">CORE DIAGNOSTICS</span>
            </button>
            <button
              onClick={() => setActiveSubScreen('database')}
              className="p-3 text-center border border-amber-500/20 hover:border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10 rounded-2xl transition-all cursor-pointer space-y-1.5"
            >
              <HardDrive className="h-4 w-4 text-amber-400 mx-auto" />
              <span className="text-[10px] font-bold text-amber-400 block font-mono">DATABASE INSPECT</span>
            </button>
            <button
              onClick={() => setActiveSubScreen('ai_sandbox')}
              className="p-3 text-center border border-amber-500/20 hover:border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10 rounded-2xl transition-all cursor-pointer space-y-1.5"
            >
              <Cpu className="h-4 w-4 text-amber-400 mx-auto" />
              <span className="text-[10px] font-bold text-amber-400 block font-mono">AI TESTING ENGINE</span>
            </button>
            <button
              onClick={() => setActiveSubScreen('admin')}
              className="p-3 text-center border border-amber-500/20 hover:border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10 rounded-2xl transition-all cursor-pointer space-y-1.5"
            >
              <ShieldAlert className="h-4 w-4 text-amber-400 mx-auto" />
              <span className="text-[10px] font-bold text-amber-400 block font-mono">SECURE ADMIN PORTAL</span>
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
