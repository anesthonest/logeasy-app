import React, { useState } from 'react';
import { 
  User, Lock, Gem, Database, Terminal, Sliders, ShieldAlert, Cpu, 
  ArrowLeft, CheckCircle, RefreshCw, Key, LogIn, LogOut, Globe, Bell,
  SlidersHorizontal, HardDrive, AlertTriangle, Shield, Check, Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AuthSession } from '../../features/auth/auth_service';
import { AppSettings } from '../../features/settings/settings_provider';
import { SyncStatus } from '../../core/sync/sync_engine';
import { LocalJournalEntry } from '../../core/database/local_db';
import SecurityPrivacyDashboard from './SecurityPrivacyDashboard';
import MonetizationDashboard from './MonetizationDashboard';
import { AdminConsole } from '../admin/AdminConsole';

interface RedesignedProfileProps {
  userId: string;
  session: AuthSession;
  handleLogout: () => void;
  authEmail: string;
  setAuthEmail: (e: string) => void;
  authPassword: string;
  setAuthPassword: (p: string) => void;
  authName: string;
  setAuthName: (n: string) => void;
  authError: string | null;
  isRegistering: boolean;
  setIsRegistering: (r: boolean) => void;
  handleAuthSubmit: (e: React.FormEvent) => void;
  handleOAuthGoogle: () => void;
  handleAuthGuest: () => void;
  syncState: SyncStatus;
  handleForceSync: () => void;
  settings: AppSettings;
  settingsProvider: any;
  notificationManager: any;
  securityManager: any;
  aiService: any;
  logs: any[];
  logFilter: string;
  setLogFilter: (f: any) => void;
  logger: any;
  reloadLocalEntries: () => void;
  localEntries: LocalJournalEntry[];
  activeProfileSection: 'auth' | 'monetization' | 'security' | 'database' | 'diagnostics' | 'ai_sandbox' | 'admin' | 'settings' | 'grid';
  setActiveProfileSection: (section: any) => void;
  journalText: string;
  setJournalText: (t: string) => void;
  journalMood: number;
  setJournalMood: (m: number) => void;
  journalMoodLabel: string;
  setJournalMoodLabel: (l: string) => void;
  journalCategories: string;
  setJournalCategories: (c: string) => void;
  conflictTrigger: boolean;
  setConflictTrigger: (t: boolean) => void;
  handleSaveJournal: () => void;
  recordings: any[];
  aiPromptType: string;
  setAiPromptType: (t: any) => void;
  aiCustomInput: string;
  setAiCustomInput: (i: string) => void;
  aiOutput: any;
  aiLoading: boolean;
  handleAIInsightRequest: () => void;
}

export default function RedesignedProfile({
  userId,
  session,
  handleLogout,
  authEmail,
  setAuthEmail,
  authPassword,
  setAuthPassword,
  authName,
  setAuthName,
  authError,
  isRegistering,
  setIsRegistering,
  handleAuthSubmit,
  handleOAuthGoogle,
  handleAuthGuest,
  syncState,
  handleForceSync,
  settings,
  settingsProvider,
  notificationManager,
  securityManager,
  aiService,
  logs,
  logFilter,
  setLogFilter,
  logger,
  reloadLocalEntries,
  localEntries,
  activeProfileSection,
  setActiveProfileSection,
  journalText,
  setJournalText,
  journalMood,
  setJournalMood,
  journalMoodLabel,
  setJournalMoodLabel,
  journalCategories,
  setJournalCategories,
  conflictTrigger,
  setConflictTrigger,
  handleSaveJournal,
  recordings,
  aiPromptType,
  setAiPromptType,
  aiCustomInput,
  setAiCustomInput,
  aiOutput,
  aiLoading,
  handleAIInsightRequest
}: RedesignedProfileProps) {

  // Category items
  const categories = [
    { id: 'auth', name: 'Identity & Vault Access', desc: 'Secure encryption credentials and bio locks', icon: Lock, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
    { id: 'monetization', name: 'Premium Plans & Growth', desc: 'Manage your active subscription and licenses', icon: Gem, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' },
    { id: 'security', name: 'Privacy Center & Encryption', desc: 'Manage AES-256 local storage configurations', icon: Shield, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    { id: 'database', name: 'Local Database & Sync Queue', desc: 'Force IndexedDB backup synchronization', icon: Database, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
    { id: 'settings', name: 'Preferences & Accessibility', desc: 'Language, themes, and screen reader simulation', icon: SlidersHorizontal, color: 'text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/20' },
    { id: 'ai_sandbox', name: 'AI Model & Abstraction', desc: 'Manage active AI provider prompt templates', icon: Cpu, color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
    { id: 'diagnostics', name: 'Trace Log & System Diagnostics', desc: 'Real-time trace logs and App Check validation', icon: Terminal, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
    { id: 'admin', name: 'Secure Administrator Desk', desc: 'App telemetry controls and developer tools', icon: ShieldAlert, color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' }
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      
      {/* 1. HEADER PROFILE CARD */}
      <div className="p-6 rounded-3xl bg-gray-500/5 border border-gray-500/10 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4 text-center sm:text-left flex-col sm:flex-row">
          <div className="h-14 w-14 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white text-lg font-black border-2 border-cyan-400/30">
            {session.user?.displayName?.charAt(0) || session.user?.email?.charAt(0) || '👤'}
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-100">
              {session.user?.displayName || 'Guest Mind'}
            </h2>
            <p className="text-xs text-gray-400 font-mono mt-0.5 truncate max-w-[240px] sm:max-w-none">
              {session.user?.email || 'Standalone offline-first session'}
            </p>
            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono mt-1.5 uppercase font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              Premium Active Tier
            </span>
          </div>
        </div>

        {session.isAuthenticated && (
          <button 
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-xs font-semibold cursor-pointer transition-all shrink-0"
          >
            <LogOut className="h-4 w-4" />
            <span>Safely Lock Vault</span>
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {activeProfileSection === 'grid' ? (
          
          /* 2. MAIN CATEGORIES GRID */
          <motion.div 
            key="grid"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-5"
          >
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveProfileSection(c.id as any)}
                className="p-5 rounded-3xl bg-gray-500/5 border border-gray-500/10 hover:border-gray-500/20 flex items-start gap-4 text-left transition-all hover:translate-y-[-2px] group cursor-pointer"
              >
                <div className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 border ${c.color}`}>
                  <c.icon className="h-5.5 w-5.5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-gray-100 group-hover:text-cyan-400 transition-colors">
                    {c.name}
                  </h3>
                  <p className="text-[11px] text-gray-400 leading-normal">
                    {c.desc}
                  </p>
                </div>
              </button>
            ))}
          </motion.div>
          
        ) : (
          
          /* 3. EXPANDED VIEW WITH BACK ACTION */
          <motion.div 
            key={activeProfileSection}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <button 
              onClick={() => setActiveProfileSection('grid')}
              className="flex items-center gap-1.5 text-xs text-cyan-400 font-bold hover:text-cyan-300 transition-colors py-1 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Profile Settings Hub</span>
            </button>

            {/* A: IDENTITY & VAULT ACCESS */}
            {activeProfileSection === 'auth' && (
              <div className="max-w-md mx-auto w-full p-6 rounded-3xl bg-gray-500/5 border border-gray-500/10 space-y-4">
                <div className="text-center space-y-1">
                  <h3 className="text-sm font-bold text-gray-200">Vault Security Authentication</h3>
                  <p className="text-[11px] text-gray-400">Lock, backup, or access your decrypted spoken logs across devices.</p>
                </div>

                {session.isAuthenticated ? (
                  <div className="space-y-4 text-center">
                    <div className="h-10 w-10 mx-auto rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                      <CheckCircle className="h-5 w-5" />
                    </div>
                    <div className="text-xs text-gray-300">
                      You are securely signed in as <span className="font-semibold text-white">{session.user?.email}</span>.
                    </div>
                    <button 
                      onClick={handleLogout}
                      className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-xs font-semibold cursor-pointer"
                    >
                      Lock Vault and Exit
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleAuthSubmit} className="space-y-3">
                    {authError && (
                      <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span>{authError}</span>
                      </div>
                    )}
                    {isRegistering && (
                      <input 
                        type="text" 
                        required 
                        placeholder="Full Name" 
                        value={authName} 
                        onChange={(e) => setAuthName(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-500/5 border border-gray-500/20 rounded-xl text-xs focus:border-cyan-500 outline-none"
                      />
                    )}
                    <input 
                      type="email" 
                      required 
                      placeholder="Secure Email" 
                      value={authEmail} 
                      onChange={(e) => setAuthEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-500/5 border border-gray-500/20 rounded-xl text-xs focus:border-cyan-500 outline-none"
                    />
                    <input 
                      type="password" 
                      required 
                      placeholder="Password" 
                      value={authPassword} 
                      onChange={(e) => setAuthPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-500/5 border border-gray-500/20 rounded-xl text-xs focus:border-cyan-500 outline-none"
                    />
                    <button type="submit" className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer">
                      {isRegistering ? 'Register Private Vault' : 'Decrypt & Open Vault'}
                    </button>
                    <div className="flex gap-2 justify-center py-1">
                      <button type="button" onClick={handleOAuthGoogle} className="text-[11px] border border-gray-500/20 hover:bg-gray-500/5 px-3 py-1.5 rounded-lg text-gray-300">
                        Google Login
                      </button>
                      <button type="button" onClick={handleAuthGuest} className="text-[11px] border border-gray-500/20 hover:bg-gray-500/5 px-3 py-1.5 rounded-lg text-cyan-400">
                        Anonymous Guest
                      </button>
                    </div>
                    <button type="button" onClick={() => setIsRegistering(!isRegistering)} className="text-[10px] text-gray-500 hover:text-cyan-400 mx-auto block">
                      {isRegistering ? 'Already have a vault? Access' : 'Create new secure voice vault'}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* B: PREMIUM PLANS & GROWTH */}
            {activeProfileSection === 'monetization' && (
              <MonetizationDashboard userId={userId} />
            )}

            {/* C: PRIVACY CENTER */}
            {activeProfileSection === 'security' && (
              <SecurityPrivacyDashboard userId={userId} />
            )}

            {/* D: DATABASE & SYNC QUEUE */}
            {activeProfileSection === 'database' && (
              <div className="p-6 rounded-3xl bg-gray-500/5 border border-gray-500/10 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-gray-200">IndexedDB Local Database and Backup Synchronization</h3>
                    <p className="text-xs text-gray-400">Your thoughts are cached locally and synchronized whenever network status is online.</p>
                  </div>
                  <button 
                    onClick={handleForceSync}
                    disabled={!syncState.isOnline || syncState.isSyncing}
                    className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-500 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RefreshCw className={`h-4 w-4 ${syncState.isSyncing ? 'animate-spin' : ''}`} />
                    <span>Synchronize Database Backup</span>
                  </button>
                </div>

                {/* Queue status banner */}
                <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 flex items-center justify-between text-xs text-amber-400">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4.5 w-4.5 animate-pulse" />
                    <span>Sync queue state: {syncState.pendingCount} elements pending write back</span>
                  </div>
                  <span className="font-mono text-[10px]">Policy: Client Wins</span>
                </div>

                {/* Simulated entry composer box */}
                <div className="p-5 rounded-2xl bg-gray-500/5 border border-gray-200/5 space-y-3 max-w-xl">
                  <h4 className="text-xs font-bold text-cyan-400">Simulate Spoken Entry Stream Text Composer</h4>
                  <div className="space-y-3">
                    <textarea 
                      value={journalText} 
                      onChange={(e) => setJournalText(e.target.value)}
                      placeholder="Type a simulated voice stream transcription here..." 
                      rows={3}
                      className="w-full px-3 py-2 bg-gray-500/5 border border-gray-500/20 rounded-xl text-xs focus:border-cyan-500 outline-none text-gray-200"
                    />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-gray-400 font-mono">Emotion Score: {journalMood}</span>
                        <input 
                          type="range" min="1" max="10" value={journalMood} 
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setJournalMood(val);
                            const moods: Record<number, string> = {
                              1: 'Drained', 2: 'Anxious', 3: 'Stressed', 4: 'Fatigued',
                              5: 'Neutral', 6: 'Calm', 7: 'Satisfied', 8: 'Happy',
                              9: 'Energized', 10: 'Optimistic'
                            };
                            setJournalMoodLabel(moods[val] || 'Reflective');
                          }}
                          className="accent-cyan-400 h-1"
                        />
                      </div>
                      <button 
                        onClick={handleSaveJournal}
                        className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold cursor-pointer"
                      >
                        Write Sim Record
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* E: PREFERENCES & ACCESSIBILITY */}
            {activeProfileSection === 'settings' && (
              <div className="p-6 rounded-3xl bg-gray-500/5 border border-gray-500/10 grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Core Preferences */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400">User Interface Customization</h4>
                  
                  <div className="flex items-center justify-between text-xs border-b border-gray-500/5 pb-2">
                    <div>
                      <span className="font-semibold text-gray-200 block">System Visual Theme</span>
                      <span className="text-[11px] text-gray-400">Change local layout skin</span>
                    </div>
                    <select 
                      value={settings.theme}
                      onChange={(e) => settingsProvider.updateSettings({ theme: e.target.value as any })}
                      className="bg-gray-800 border border-gray-700 rounded-xl px-2.5 py-1.5 text-xs text-gray-200"
                    >
                      <option value="light">Light Slate theme</option>
                      <option value="dark">Charcoal Vault Dark</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between text-xs border-b border-gray-500/5 pb-2">
                    <div>
                      <span className="font-semibold text-gray-200 block">Localization & Dialogs</span>
                      <span className="text-[11px] text-gray-400">Manage spoken voice models</span>
                    </div>
                    <select 
                      value={settings.language}
                      onChange={(e) => settingsProvider.updateSettings({ language: e.target.value as any })}
                      className="bg-gray-800 border border-gray-700 rounded-xl px-2.5 py-1.5 text-xs text-gray-200"
                    >
                      <option value="en">English (US)</option>
                      <option value="es">Español (ES)</option>
                    </select>
                  </div>
                </div>

                {/* Accessibility */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400">Accessibility Safeguards</h4>

                  <div className="flex items-center justify-between text-xs border-b border-gray-500/5 pb-2">
                    <div>
                      <span className="font-semibold text-gray-200 block">Increase Text Sizing Scale</span>
                      <span className="text-[11px] text-gray-400">Boost read visibility on-screen</span>
                    </div>
                    <input 
                      type="checkbox"
                      checked={settings.accessibility.largeText}
                      onChange={(e) => settingsProvider.updateSettings({ 
                        accessibility: { ...settings.accessibility, largeText: e.target.checked } 
                      })}
                      className="accent-indigo-500 h-4 w-4"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs border-b border-gray-500/5 pb-2">
                    <div>
                      <span className="font-semibold text-gray-200 block">Screen Reader Simulator</span>
                      <span className="text-[11px] text-gray-400">Speak hovered prompt descriptions out loud</span>
                    </div>
                    <input 
                      type="checkbox"
                      checked={settings.accessibility.screenReaderSimulation}
                      onChange={(e) => {
                        settingsProvider.updateSettings({ 
                          accessibility: { ...settings.accessibility, screenReaderSimulation: e.target.checked } 
                        });
                        if (e.target.checked) {
                          settingsProvider.speakSimulation("Voice assistant readout is ready.");
                        }
                      }}
                      className="accent-indigo-500 h-4 w-4"
                    />
                  </div>
                </div>

              </div>
            )}

            {/* F: AI MODEL & ABSTRACTION */}
            {activeProfileSection === 'ai_sandbox' && (
              <div className="p-6 rounded-3xl bg-gray-500/5 border border-gray-500/10 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-200">AI Model Abstraction Sandbox</h3>
                  <p className="text-xs text-gray-400">Test different analytical queries against saved transcripts or manual inputs.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-gray-400">Select prompt category</label>
                      <select 
                        value={aiPromptType}
                        onChange={(e) => setAiPromptType(e.target.value as any)}
                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-2.5 py-1.5"
                      >
                        <option value="summarize_journal">Summarize Journal Entries</option>
                        <option value="extract_entities">Extract Personal Entities</option>
                        <option value="detect_cognitive_shift">Analyze Cognitive Shifts</option>
                        <option value="suggest_coaching_prompts">Suggest Coaching Prompt</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-gray-400">Input material transcript</label>
                      <textarea 
                        value={aiCustomInput}
                        onChange={(e) => setAiCustomInput(e.target.value)}
                        placeholder="Type some transcripts to analyze, or leave empty to use recent local journals."
                        rows={3}
                        className="w-full bg-gray-500/5 border border-gray-500/20 rounded-xl px-2.5 py-1.5 text-xs outline-none focus:border-cyan-500 text-gray-200"
                      />
                    </div>

                    <button 
                      onClick={handleAIInsightRequest}
                      disabled={aiLoading}
                      className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold disabled:opacity-50 cursor-pointer"
                    >
                      {aiLoading ? 'Interrogating model...' : 'Interrogate Model & Return'}
                    </button>
                  </div>

                  <div className="p-4 rounded-2xl bg-gray-900/40 border border-gray-800 space-y-2 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] text-gray-400 font-mono block">Response Object Payload:</span>
                      <p className="text-[11px] text-gray-300 whitespace-pre-wrap line-clamp-6 font-mono bg-gray-950/20 p-2 rounded border border-gray-800 mt-1">
                        {aiOutput ? JSON.stringify(aiOutput.data || aiOutput, null, 2) : 'Awaiting model interrogation query execution...'}
                      </p>
                    </div>
                    {aiOutput && (
                      <div className="text-[10px] text-cyan-400 font-mono">
                        Provider: {aiOutput.provider} | Cache: {aiOutput.cached ? 'HIT' : 'MISS'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* G: TRACE LOGS & SYSTEM DIAGNOSTICS */}
            {activeProfileSection === 'diagnostics' && (
              <div className="p-6 rounded-3xl bg-gray-500/5 border border-gray-500/10 space-y-6">
                
                {/* Bento metrics status check */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3.5 rounded-2xl bg-cyan-500/5 border border-cyan-500/10">
                    <span className="text-[10px] text-cyan-400 font-mono block">Device Attestation</span>
                    <span className="text-xs font-bold text-gray-200 block mt-1">App Check Active</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-indigo-500/5 border border-indigo-500/10">
                    <span className="text-[10px] text-indigo-400 font-mono block">Offline SQLite</span>
                    <span className="text-xs font-bold text-gray-200 block mt-1">{localEntries.length} items cached</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/10">
                    <span className="text-[10px] text-amber-400 font-mono block">Sync Sync Queue</span>
                    <span className="text-xs font-bold text-gray-200 block mt-1">{syncState.pendingCount} Queued</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-fuchsia-500/5 border border-fuchsia-500/10">
                    <span className="text-[10px] text-fuchsia-400 font-mono block">Active AI Model</span>
                    <span className="text-xs font-bold text-gray-200 block mt-1 truncate">{aiService.getActiveProviderName()}</span>
                  </div>
                </div>

                {/* Subsystems info logs details */}
                <div className="font-mono text-[11px] bg-gray-950 p-4 rounded-2xl border border-gray-800 space-y-3">
                  <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                    <span className="text-gray-400">App Check Attestation token:</span>
                    <span className="text-cyan-400 truncate max-w-[200px]">{securityManager.getAppCheckToken()}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                    <span className="text-gray-400">Secure Database Salt:</span>
                    <span className="text-emerald-400">Symmetrical ACID compliant index</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">AI Tokens usage logs:</span>
                    <span>{aiService.getUsageMetrics().totalRequests} requests ({aiService.getUsageMetrics().totalTokens} tokens)</span>
                  </div>
                </div>

                {/* REAL-TIME TERMINAL TRACE LOG */}
                <div className="h-56 flex flex-col min-h-0 bg-[#070b13] border border-gray-800 rounded-2xl overflow-hidden font-mono text-[11px] select-text">
                  <div className="flex items-center justify-between px-4 py-2 bg-[#090e19] border-b border-gray-800">
                    <div className="flex items-center gap-2">
                      <Terminal className="h-4 w-4 text-cyan-400 animate-pulse" />
                      <span className="font-bold text-gray-300">LogEasy System Architecture Trace logs</span>
                    </div>
                    <select 
                      value={logFilter}
                      onChange={(e) => setLogFilter(e.target.value as any)}
                      className="bg-gray-800 border border-gray-700 text-[10px] text-gray-400 px-2 py-0.5 rounded outline-none"
                    >
                      <option value="ALL">All Levels</option>
                      <option value="INFO">INFO</option>
                      <option value="WARN">WARN</option>
                      <option value="ERROR">ERROR</option>
                    </select>
                  </div>
                  <div className="flex-1 p-3 overflow-y-auto space-y-1">
                    {logs
                      .filter((l) => logFilter === 'ALL' || l.level === logFilter)
                      .map((l, index) => {
                        let col = 'text-gray-400';
                        if (l.level === 'WARN') col = 'text-amber-400';
                        if (l.level === 'ERROR') col = 'text-red-400 font-bold';
                        return (
                          <div key={index} className="flex gap-2">
                            <span className="text-gray-600 text-[10px] shrink-0">{new Date(l.timestamp).toLocaleTimeString()}</span>
                            <span className={`font-semibold text-[10px] shrink-0 uppercase ${col}`}>[{l.level}]</span>
                            <span className="text-cyan-500 shrink-0">[{l.context}]</span>
                            <span className="text-gray-300 flex-1 whitespace-pre-wrap">{l.message}</span>
                          </div>
                        );
                      })}
                  </div>
                </div>

              </div>
            )}

            {/* H: SECURE ADMINISTRATOR DESK */}
            {activeProfileSection === 'admin' && (
              <AdminConsole userId={userId} />
            )}

          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
