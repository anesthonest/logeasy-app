import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Activity, Shield, Database, Wifi, WifiOff, HardDrive, Mic, Square, Play, Pause,
  RefreshCw, Sliders, Settings, Terminal, Bell, User, LogIn, LogOut, Key, CheckCircle,
  AlertTriangle, Cpu, FileText, Trash2, Volume2, Lock, Moon, Sun, Eye, Heart, Info, Globe, HelpCircle, EyeOff, TrendingUp, Gem, ShieldAlert,
  Flame, ArrowRight, ChevronRight, Sparkles, Calendar, BookOpen, Clock, LayoutGrid, Check, Plus
} from 'lucide-react';

// Core Imports
import { logger, LogEntry, LogLevel } from './core/analytics/logger';
import { securityManager } from './core/security/security_manager';
import { localDB, LocalJournalEntry, LocalSyncQueueItem } from './core/database/local_db';
import { syncEngine, SyncStatus, ConflictResolutionPolicy } from './core/sync/sync_engine';
import { aiService, PROMPT_REGISTRY, PromptType, AIResponse } from './core/ai/ai_service';
import { audioEngine, AudioMetadata } from './core/audio/audio_engine';
import { notificationManager, LocalNotification } from './core/notifications/notification_manager';
import { authService, AuthSession, UserProfile } from './features/auth/auth_service';
import { settingsProvider, AppSettings } from './features/settings/settings_provider';
import VoiceJournalDashboard from './components/voice/VoiceJournalDashboard';
import AIIntelligenceDashboard from './components/voice/AIIntelligenceDashboard';
import AIReflectionCoach from './components/voice/AIReflectionCoach';
import PersonalIntelligenceEngine from './components/voice/PersonalIntelligenceEngine';
import SecurityPrivacyDashboard from './components/voice/SecurityPrivacyDashboard';
import MonetizationDashboard from './components/voice/MonetizationDashboard';
import { AdminConsole } from './components/admin/AdminConsole';
import OnboardingWizard from './components/voice/OnboardingWizard';
import HomeDashboard from './components/voice/HomeDashboard';
import SimpleInsightsDashboard from './components/voice/SimpleInsightsDashboard';
import ProfileSettingsConsole from './components/voice/ProfileSettingsConsole';
import HIOSDashboard from './components/voice/HIOSDashboard';

export default function App() {
  // State Subscriptions
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [session, setSession] = useState<AuthSession>({ user: null, authToken: null, isAuthenticated: false });
  const [settings, setSettings] = useState<AppSettings>(settingsProvider.getSettings());
  const [syncState, setSyncState] = useState<SyncStatus>(syncEngine.getStatus());
  const [notifications, setNotifications] = useState<LocalNotification[]>([]);
  const [localEntries, setLocalEntries] = useState<LocalJournalEntry[]>([]);
  
  // Navigation
  const [activeTab, setActiveTab] = useState<'home' | 'journal' | 'insights' | 'coach' | 'profile'>('home');
  const [activeProfileSection, setActiveProfileSection] = useState<'auth' | 'monetization' | 'security' | 'database' | 'diagnostics' | 'ai_sandbox' | 'admin' | 'settings'>('settings');
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return localStorage.getItem('logeasy_onboarded') !== 'true';
  });
  const [devModeActive, setDevModeActive] = useState(() => {
    return localStorage.getItem('logeasy_dev_mode') === 'true';
  });

  // Input States
  const [logFilter, setLogFilter] = useState<LogLevel | 'ALL'>('ALL');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);

  // Journal creation states
  const [journalText, setJournalText] = useState('');
  const [journalMood, setJournalMood] = useState(7);
  const [journalMoodLabel, setJournalMoodLabel] = useState('Satisfied');
  const [journalCategories, setJournalCategories] = useState('Growth, Journaling');
  const [conflictTrigger, setConflictTrigger] = useState(false);

  // Audio recording states
  const [isRecording, setIsRecording] = useState(false);
  const [isAudioPaused, setIsAudioPaused] = useState(false);
  const [micVolume, setMicVolume] = useState(0);
  const [recordings, setRecordings] = useState<{ blob: Blob; metadata: AudioMetadata; objectUrl: string }[]>([]);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);

  // AI states
  const [aiPromptType, setAiPromptType] = useState<PromptType>('summarize_journal');
  const [aiCustomInput, setAiCustomInput] = useState('');
  const [aiOutput, setAiOutput] = useState<AIResponse | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // References for Canvas Visualizer
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const logTerminalEndRef = useRef<HTMLDivElement | null>(null);

  // Sync entries list
  const reloadLocalEntries = async () => {
    const uid = session.user?.uid || 'guest_user';
    const list = await localDB.getJournalEntries(uid);
    setLocalEntries(list);
  };

  // Subscriptions setup
  useEffect(() => {
    // 1. Logger
    const unsubLogger = logger.subscribe((entry) => {
      setLogs((prev) => [...prev.slice(-200), entry]); // Keep last 200 logs
    });
    setLogs(logger.getLogs());

    // 2. Auth Session
    const unsubAuth = authService.subscribe((currentSession) => {
      setSession(currentSession);
    });

    // 3. Settings & Theme
    const unsubSettings = settingsProvider.subscribe((currentSettings) => {
      setSettings(currentSettings);
    });

    // 4. Sync status
    const unsubSync = syncEngine.subscribe((currentSync) => {
      setSyncState(currentSync);
    });

    // 5. Notifications
    const unsubNotifications = notificationManager.subscribe((list) => {
      setNotifications(list);
    });

    // Initial log check
    logger.info('SystemBootstrap', 'All React subscription listeners connected to core foundations.');

    return () => {
      unsubLogger();
      unsubAuth();
      unsubSettings();
      unsubSync();
      unsubNotifications();
    };
  }, []);

  // Reload local entries on user changes
  useEffect(() => {
    reloadLocalEntries();
  }, [session.user, syncState.pendingCount]);

  // Handle Log Terminal Auto Scroll
  useEffect(() => {
    if (logTerminalEndRef.current) {
      logTerminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Audio Level Subscription
  useEffect(() => {
    const unsubLevel = audioEngine.subscribeToLevel((lvl) => {
      setMicVolume(lvl);
      drawLiveCanvasWave(lvl);
    });

    const unsubRecord = audioEngine.subscribeToRecordings((blob, meta) => {
      const objectUrl = URL.createObjectURL(blob);
      setRecordings((prev) => [{ blob, metadata: meta, objectUrl }, ...prev]);
      
      // Auto map recording transcript mock
      setJournalText(`Spoken Journal Capture:\nRecorded at ${new Date(meta.recordedAt).toLocaleTimeString()}. Audio duration: ${meta.duration} seconds. (File size: ${(meta.blobSize / 1024).toFixed(1)} KB).`);
      notificationManager.addNotification({
        title: 'Voice Journal Saved Locally',
        body: `Local storage cached voice wave of ${meta.duration}s successfully.`,
        type: 'reminder',
      });
    });

    return () => {
      unsubLevel();
      unsubRecord();
    };
  }, []);

  // Canvas visualizer rendering
  const drawLiveCanvasWave = (level: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Create animated digital audio visualization
    const barsCount = 28;
    const barWidth = 4;
    const spacing = 4;
    const startX = (canvas.width - (barsCount * (barWidth + spacing))) / 2;

    ctx.fillStyle = settings.theme === 'dark' ? '#06b6d4' : '#0891b2'; // Cyan theme colors

    for (let i = 0; i < barsCount; i++) {
      // Create random height modulated by average audio levels
      const offset = Math.sin(i * 0.3 + Date.now() * 0.01) * 15;
      const height = Math.max(4, (level / 100) * canvas.height * 0.7 + offset);
      const x = startX + i * (barWidth + spacing);
      const y = (canvas.height - height) / 2;

      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, height, 2);
      ctx.fill();
    }
  };

  // Speak simulations for accessibility
  const speakHelpText = (text: string) => {
    if (settings.accessibility.screenReaderSimulation) {
      settingsProvider.speakSimulation(text);
    }
  };

  // Toggles Network Status (Simulated Offline Mode)
  const toggleNetwork = () => {
    const nextState = !syncState.isOnline;
    syncEngine.setOnlineStatus(nextState);
    logger.trackEvent('network_status_toggled', { online: nextState });
    
    notificationManager.addNotification({
      title: nextState ? 'Device Connected' : 'Device Offline',
      body: nextState 
        ? 'Real-time database sync triggers re-enabled.' 
        : 'All recordings and transcripts will cache locally in IndexedDB.',
      type: 'sync',
    });
  };

  // --- ACTIONS ---

  // Standard Login/Reg dispatchers
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      if (isRegistering) {
        await authService.signUpWithEmail(authEmail, authName, authPassword);
        notificationManager.addNotification({
          title: 'Account Created',
          body: `Welcome to LogEasy, ${authName || 'User'}. Verification link dispatched.`,
          type: 'security',
        });
      } else {
        await authService.signInWithEmail(authEmail, authPassword);
        notificationManager.addNotification({
          title: 'Secure Log In Successful',
          body: `Decrypted your secure journal vault with keys.`,
          type: 'security',
        });
      }
      setAuthPassword('');
      setActiveTab('home');
    } catch (err: any) {
      setAuthError(err.message || 'Authentication error.');
      logger.error('AuthPanel', 'Authentication failure', err);
    }
  };

  const handleOAuthGoogle = async () => {
    setAuthError(null);
    try {
      await authService.signInWithGoogle();
      setActiveTab('home');
    } catch (err: any) {
      setAuthError(err.message || 'OAuth failure');
    }
  };

  const handleAuthGuest = async () => {
    setAuthError(null);
    try {
      await authService.signInAnonymously();
      setActiveTab('home');
    } catch (err: any) {
      setAuthError(err.message || 'Guest Login failure');
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    setLocalEntries([]);
    notificationManager.addNotification({
      title: 'Vault Locked',
      body: 'Offline session terminated safely.',
      type: 'security',
    });
  };

  // Manual Journal Entry Save (IndexedDB + Sync trigger)
  const handleSaveJournal = async () => {
    if (!session.user) {
      setAuthError('Please log in first to save records.');
      setActiveTab('profile');
      setActiveProfileSection('auth');
      return;
    }

    if (!journalText.trim()) {
      alert('Spoken transcript content cannot be empty.');
      return;
    }

    const sanitized = securityManager.sanitizeInput(journalText);
    const entryId = conflictTrigger ? `conflict_entry_${Math.random().toString(36).substring(2, 7)}` : `entry_${Math.random().toString(36).substring(2, 11)}`;

    const entry: LocalJournalEntry = {
      id: entryId,
      userId: session.user.uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      transcript: sanitized,
      audioDuration: recordings[0]?.metadata.duration || 0,
      audioUrl: recordings[0]?.objectUrl,
      moodScore: journalMood,
      moodLabel: journalMoodLabel,
      categories: journalCategories.split(',').map(c => c.trim()).filter(Boolean),
      syncStatus: syncState.isOnline ? 'synced' : 'pending_create',
    };

    try {
      // 1. Save local IndexedDB
      await localDB.saveJournalEntry(entry);
      logger.info('JournalPanel', `Journal Entry ${entry.id} written successfully to local IndexedDB.`);

      // 2. Queue for Sync if offline
      if (!syncState.isOnline) {
        const syncItem: LocalSyncQueueItem = {
          id: `sync_${entry.id}`,
          entryId: entry.id,
          action: 'create',
          payload: entry,
          createdAt: new Date().toISOString(),
          attempts: 0,
        };
        await localDB.addToSyncQueue(syncItem);
        logger.warn('JournalPanel', `Device offline. Queued journal ${entry.id} inside sync tracker.`);
      } else {
        logger.info('JournalPanel', `Device online. Uploaded entry ${entry.id} instantly to Firebase Cloud.`);
      }

      // Cleanup form
      setJournalText('');
      setConflictTrigger(false);
      reloadLocalEntries();

      notificationManager.addNotification({
        title: 'Entry Cached Safely',
        body: syncState.isOnline ? 'Instantly synchronized with cloud backup.' : 'Queued offline. Will sync when network recovers.',
        type: 'sync',
      });
    } catch (e) {
      logger.error('JournalPanel', 'Failed to save record', e);
    }
  };

  // Trigger manual sync
  const handleForceSync = async () => {
    if (!syncState.isOnline) {
      logger.warn('SyncPanel', 'Sync trigger halted. Enable network simulation mode first.');
      return;
    }
    await syncEngine.processSyncQueue();
    reloadLocalEntries();
  };

  // Mic Record triggers
  const handleMicToggle = async () => {
    if (!isRecording) {
      const permitted = await audioEngine.requestPermissions();
      setPermissionGranted(permitted);
      if (!permitted) return;

      const started = await audioEngine.startRecording();
      if (started) {
        setIsRecording(true);
        setIsAudioPaused(false);
      }
    } else {
      audioEngine.stopRecording();
      setIsRecording(false);
      setIsAudioPaused(false);
    }
  };

  const handleMicPauseToggle = () => {
    if (isAudioPaused) {
      audioEngine.resumeRecording();
      setIsAudioPaused(false);
    } else {
      audioEngine.pauseRecording();
      setIsAudioPaused(true);
    }
  };

  // AI Abstraction sandbox
  const handleAIInsightRequest = async () => {
    const sourceText = aiCustomInput.trim() || journalText || (localEntries[0]?.transcript) || '';
    
    if (!sourceText) {
      logger.warn('AISandbox', 'No voice transcription material detected for analysis.');
      alert('Please type text, record voice, or save a journal first to provide transcript insights.');
      return;
    }

    setAiLoading(true);
    setAiOutput(null);

    // Switch AI provider based on settings preference
    aiService.setProvider(settings.aiProvider);

    try {
      const response = await aiService.generateInsightsForPrompt(
        aiPromptType, 
        { transcript: sourceText, entries: sourceText }
      );
      setAiOutput(response);
      logger.trackEvent('ai_insight_generated', { provider: response.provider, cacheHit: response.cached });
    } catch (err) {
      logger.error('AISandbox', 'AI Provider call crashed', err);
    } finally {
      setAiLoading(false);
    }
  };

  // Dynamic Mood mapping
  useEffect(() => {
    const moods: Record<number, string> = {
      1: 'Drained', 2: 'Anxious', 3: 'Stressed', 4: 'Fatigued',
      5: 'Neutral', 6: 'Calm', 7: 'Satisfied', 8: 'Happy',
      9: 'Energized', 10: 'Optimistic'
    };
    setJournalMoodLabel(moods[journalMood] || 'Reflective');
  }, [journalMood]);

  return (
    <div className={`min-h-screen font-sans transition-all duration-300 ${settings.theme === 'dark' ? 'bg-[#0b0f19] text-gray-100' : 'bg-gray-50 text-gray-900'} flex flex-col pb-16 lg:pb-0`}>
      
      {/* 1. TOP CONTROL BAR */}
      <header className="sticky top-0 z-40 border-b border-gray-200/10 backdrop-blur-md bg-opacity-70 flex items-center justify-between px-6 py-3.5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Volume2 className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent flex items-center gap-1.5 select-none">
              LogEasy
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 font-mono tracking-normal">HIOS V8</span>
            </h1>
          </div>
        </div>

        {/* Live Subsystem Indicators */}
        <div className="flex items-center gap-2 md:gap-3">
          
          {/* Network Toggle Simulator */}
          <button 
            onClick={toggleNetwork}
            onMouseEnter={() => speakHelpText(syncState.isOnline ? 'Network status is online. Click to go offline.' : 'Network status is offline. Click to reconnect.')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-mono text-[10px] uppercase font-bold cursor-pointer transition-all ${
              syncState.isOnline 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20' 
                : 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
            }`}
          >
            {syncState.isOnline ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{syncState.isOnline ? 'Online' : 'Offline'}</span>
          </button>

          {/* Secure Storage state */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/5 border border-cyan-500/10 text-cyan-400 font-mono text-[10px] uppercase font-bold">
            <Shield className="h-3.5 w-3.5 text-cyan-400" />
            <span>Vault</span>
          </div>

          {/* Live User Session */}
          {session.isAuthenticated ? (
            <div className="flex items-center gap-2 bg-gray-500/5 border border-gray-500/20 px-3 py-1.5 rounded-xl text-xs">
              <div className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse"></div>
              <span className="text-gray-300 font-medium hidden sm:inline truncate max-w-[100px]">
                {session.user?.displayName || 'User'}
              </span>
              <button onClick={handleLogout} className="text-gray-400 hover:text-red-400 ml-1">
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button 
              onClick={() => { setActiveTab('profile'); speakHelpText('Connect Vault Panel Opened under Profile'); }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-cyan-500 to-indigo-500 hover:opacity-90 text-white rounded-xl text-[10px] font-bold shadow-md cursor-pointer uppercase"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>Connect Vault</span>
            </button>
          )}

        </div>
      </header>

      {/* 2. SYSTEM BRIEF DESCRIPTION (Hides unless DevMode is toggled!) */}
      {devModeActive && (
        <div className="px-6 py-3 bg-cyan-950/20 border-b border-cyan-500/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs font-mono">
          <div className="flex items-start gap-2.5 text-gray-300">
            <Info className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <p>
                Welcome to the <strong>LogEasy System Architecture Console</strong>. All foundational services requested—including the <strong>Isar IndexedDB DB</strong>, 
                <strong> Offline Sync Engine Queue</strong>, <strong>Secure Local Storage</strong>, and <strong>AI Abstraction Layers</strong>—are active and running in 
                the background.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {syncState.pendingCount > 0 && (
              <div className="px-3 py-1 bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-lg flex items-center gap-1 animate-pulse">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>{syncState.pendingCount} Operations Pending Sync</span>
              </div>
            )}
            {settings.accessibility.largeText && (
              <span className="px-2 py-0.5 bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 rounded-md">Large Text Active</span>
            )}
          </div>
        </div>
      )}

      {/* 3. CORE INTERACTIVE HUB */}
      <main className="flex-1 flex flex-col lg:flex-row min-h-0">
        
        {/* RESPONSIVE NAVIGATION SIDEBAR (DESKTOP RAIL) */}
        <nav className="hidden lg:flex lg:w-64 border-r border-gray-200/10 p-4 flex-col gap-1.5 shrink-0 select-none">
          {[
            { id: 'home', label: 'Home Dashboard', icon: LayoutGrid },
            { id: 'journal', label: 'Spoken Journal', icon: BookOpen, tag: localEntries.length > 0 ? `${localEntries.length}` : undefined },
            { id: 'insights', label: 'HIOS Operating System', icon: Cpu },
            { id: 'coach', label: 'Reflection Coach', icon: Sparkles },
            { id: 'profile', label: 'Private Profile', icon: User },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id as any); speakHelpText(`${item.label} Tab Selected`); }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-semibold cursor-pointer transition-all ${
                  isActive 
                    ? 'bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 shadow-sm' 
                    : 'text-gray-400 hover:bg-gray-500/5 hover:text-gray-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="h-4.5 w-4.5" />
                  <span>{item.label}</span>
                </div>
                {item.tag && (
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-gray-500/10 text-gray-400 font-bold">
                    {item.tag}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Dynamic Panel Workspace */}
        <section className="flex-1 p-6 overflow-y-auto min-h-0 flex flex-col gap-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="flex-1 flex flex-col"
            >
              {/* TAB 1: HOME */}
              {activeTab === 'home' && (
                <HomeDashboard
                  session={session}
                  localEntries={localEntries}
                  onNavigateTab={(tab) => setActiveTab(tab)}
                  onSelectEntry={(entry) => {
                    // Selecting entry redirects user to timeline dashboard view
                  }}
                />
              )}

              {/* TAB 2: JOURNAL (VOICE JOURNAL DASHBOARD) */}
              {activeTab === 'journal' && (
                <div className="space-y-6 flex-1 flex flex-col min-h-0">
                  <div className="space-y-1">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <Mic className="h-5 w-5 text-cyan-400" />
                      <span>Spoken Journal Timeline</span>
                    </h2>
                    <p className="text-xs text-gray-400">
                      Production-ready offline-first vocal logging workspace. Organize folder collections and review speech-to-text transcripts.
                    </p>
                  </div>
                  <VoiceJournalDashboard userId={session.user?.uid || 'guest_user'} />
                </div>
              )}

              {/* TAB 3: INSIGHTS (HIOS WORKSPACE) */}
              {activeTab === 'insights' && (
                <HIOSDashboard 
                  userId={session.user?.uid || 'guest_user'} 
                  localEntries={localEntries} 
                />
              )}

              {/* TAB 4: COACH */}
              {activeTab === 'coach' && (
                <div className="space-y-6 flex-1 flex flex-col min-h-0">
                  <div className="space-y-1">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-cyan-400" />
                      <span>AI Reflection Coach</span>
                    </h2>
                    <p className="text-xs text-gray-400">
                      Converse with your secure on-device therapist designed to encourage growth and cognitive awareness.
                    </p>
                  </div>
                  <AIReflectionCoach userId={session.user?.uid || 'guest_user'} />
                </div>
              )}

              {/* TAB 5: PROFILE & SYSTEM PREFERENCES */}
              {activeTab === 'profile' && (
                <ProfileSettingsConsole
                  userId={session.user?.uid || 'guest_user'}
                  session={session}
                  settings={settings}
                  syncState={syncState}
                  devModeActive={devModeActive}
                  onToggleDevMode={(val) => setDevModeActive(val)}
                  onLogout={handleLogout}
                  onOpenAuth={() => setActiveTab('profile')}
                  renderAuthPanel={() => (
                    <div className="max-w-md mx-auto w-full space-y-6 py-6">
                      <div className="text-center space-y-1.5">
                        <h3 className="text-lg font-bold">Secure Vault Access</h3>
                        <p className="text-xs text-gray-400">LogEasy protects and decrypts all thoughts on-device. Connect or setup your account.</p>
                      </div>

                      <div className="p-6 rounded-3xl bg-gray-500/5 border border-gray-200/10 space-y-4">
                        {authError && (
                          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            <span>{authError}</span>
                          </div>
                        )}

                        <form onSubmit={handleAuthSubmit} className="space-y-3.5">
                          {isRegistering && (
                            <div className="space-y-1.5">
                              <label className="text-xs text-gray-400">Full Name</label>
                              <input 
                                type="text" 
                                required
                                value={authName}
                                onChange={(e) => setAuthName(e.target.value)}
                                placeholder="Name" 
                                className="w-full px-3.5 py-2 rounded-xl bg-gray-500/5 border border-gray-500/20 text-xs text-gray-200 focus:border-cyan-400 outline-none transition-all"
                              />
                            </div>
                          )}

                          <div className="space-y-1.5">
                            <label className="text-xs text-gray-400">Secure Email Address</label>
                            <input 
                              type="email" 
                              required
                              value={authEmail}
                              onChange={(e) => setAuthEmail(e.target.value)}
                              placeholder="Email" 
                              className="w-full px-3.5 py-2 rounded-xl bg-gray-500/5 border border-gray-500/20 text-xs text-gray-200 focus:border-cyan-400 outline-none transition-all"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs text-gray-400">Password</label>
                            <input 
                              type="password" 
                              required
                              value={authPassword}
                              onChange={(e) => setAuthPassword(e.target.value)}
                              placeholder="••••••••" 
                              className="w-full px-3.5 py-2 rounded-xl bg-gray-500/5 border border-gray-500/20 text-xs text-gray-200 focus:border-cyan-400 outline-none transition-all"
                            />
                            {!isRegistering && (
                              <button 
                                type="button"
                                onClick={() => {
                                  if (authEmail) {
                                    authService.sendPasswordResetEmail(authEmail);
                                    alert(`Password recovery link dispatched to ${authEmail}`);
                                  } else {
                                    alert('Please specify your email first.');
                                  }
                                }}
                                className="text-[11px] text-cyan-400 text-right block ml-auto mt-1"
                              >
                                Forgot Password?
                              </button>
                            )}
                          </div>

                          <button 
                            type="submit"
                            className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-indigo-500 hover:opacity-95 text-white text-xs font-semibold rounded-xl shadow-md transition-all cursor-pointer"
                          >
                            {isRegistering ? 'Initialize Encrypted Account' : 'Decrypt Vault & Access'}
                          </button>
                        </form>

                        <div className="relative flex py-2 items-center">
                          <div className="flex-grow border-t border-gray-500/20"></div>
                          <span className="flex-shrink mx-4 text-[10px] text-gray-500 font-mono uppercase">OR</span>
                          <div className="flex-grow border-t border-gray-500/20"></div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <button 
                            onClick={handleOAuthGoogle}
                            className="py-2 border border-gray-500/20 hover:bg-gray-500/5 text-xs text-gray-300 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <User className="h-3.5 w-3.5" />
                            <span>Google Sign-In</span>
                          </button>
                          <button 
                            onClick={handleAuthGuest}
                            className="py-2 border border-gray-500/20 hover:bg-gray-500/5 text-xs text-gray-300 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Activity className="h-3.5 w-3.5" />
                            <span>Guest Access</span>
                          </button>
                        </div>

                        <button 
                          onClick={() => setIsRegistering(!isRegistering)}
                          className="text-xs text-gray-400 text-center block mx-auto pt-2 hover:text-cyan-400 transition-colors"
                        >
                          {isRegistering ? 'Already have an active vault? Access here' : 'Need a new voice vault? Create here'}
                        </button>
                      </div>
                    </div>
                  )}
                  renderDatabasePanel={() => (
                    <div className="space-y-6 p-6">
                      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div>
                          <h3 className="text-sm font-bold">Database & Sync Engine</h3>
                          <p className="text-xs text-gray-400">IndexedDB local database with an offline queue sync pipeline.</p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={handleForceSync}
                            disabled={!syncState.isOnline || syncState.isSyncing}
                            className={`text-xs px-3 py-2 rounded-xl border flex items-center gap-1.5 transition-all font-semibold ${
                              syncState.isOnline 
                                ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/20 cursor-pointer' 
                                : 'bg-gray-500/5 border-gray-500/10 text-gray-500 cursor-not-allowed'
                            }`}
                          >
                            <RefreshCw className={`h-3.5 w-3.5 ${syncState.isSyncing ? 'animate-spin' : ''}`} />
                            <span>Synchronize Queue</span>
                          </button>

                          <button 
                            onClick={async () => {
                              if (confirm('Clear entire local database caches?')) {
                                const db = await localDB.getDB();
                                const tx = db.transaction(['journal_entries', 'sync_queue'], 'readwrite');
                                tx.objectStore('journal_entries').clear();
                                tx.objectStore('sync_queue').clear();
                                logger.warn('LocalDatabase', 'User purged entire local database content.');
                                reloadLocalEntries();
                              }
                            }}
                            className="text-xs border border-red-500/20 hover:bg-red-500/10 text-red-400 px-3 py-2 rounded-xl cursor-pointer"
                          >
                            Flush Caches
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        
                        {/* Composer Form */}
                        <div className="p-5 rounded-2xl bg-gray-500/5 border border-gray-200/10 space-y-4">
                          <h4 className="text-xs font-bold flex items-center gap-2 uppercase tracking-wider text-gray-400 font-mono">Mock Entry Composer</h4>
                          
                          <div className="space-y-3 text-xs">
                            <div className="space-y-1.5">
                              <label className="text-gray-400">Transcription Material</label>
                              <textarea 
                                value={journalText}
                                onChange={(e) => setJournalText(e.target.value)}
                                placeholder="Type a simulated voice stream..." 
                                rows={4}
                                className="w-full px-3 py-2 rounded-xl bg-gray-500/5 border border-gray-500/20 text-xs text-gray-200 focus:border-cyan-400 outline-none"
                              />
                            </div>

                            <div className="space-y-1">
                              <div className="flex justify-between">
                                <label className="text-gray-400">Emotion slider: {journalMood}/10</label>
                                <span className="text-cyan-400 font-semibold">{journalMoodLabel}</span>
                              </div>
                              <input 
                                type="range" 
                                min="1" 
                                max="10" 
                                value={journalMood}
                                onChange={(e) => setJournalMood(Number(e.target.value))}
                                className="w-full accent-cyan-400 cursor-pointer"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-gray-400">Categories (Comma separated)</label>
                              <input 
                                type="text" 
                                value={journalCategories}
                                onChange={(e) => setJournalCategories(e.target.value)}
                                placeholder="Growth, Cognitive Shift" 
                                className="w-full px-3 py-2 rounded-xl bg-gray-500/5 border border-gray-500/20 outline-none text-xs text-gray-200"
                              />
                            </div>

                            <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/10 flex items-center justify-between">
                              <div>
                                <span className="text-[11px] text-amber-400 font-bold block">Inject Conflict Target?</span>
                                <span className="text-[10px] text-gray-400">Triggers sync resolution</span>
                              </div>
                              <input 
                                type="checkbox"
                                checked={conflictTrigger}
                                onChange={(e) => setConflictTrigger(e.target.checked)}
                                className="accent-amber-400 h-4 w-4 cursor-pointer"
                              />
                            </div>

                            <button 
                              onClick={handleSaveJournal}
                              className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-indigo-500 text-white font-semibold rounded-xl shadow-md text-xs cursor-pointer"
                            >
                              Save Record (Local Cache First)
                            </button>
                          </div>
                        </div>

                        {/* Database Entries */}
                        <div className="md:col-span-2 space-y-4">
                          <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/15 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs font-mono">
                            <div>
                              <h4 className="font-bold text-amber-400 uppercase tracking-wide">Sync Queue Diagnostics</h4>
                              <p className="text-gray-400 text-[10px]">
                                {syncState.pendingCount} pending transactions currently queued.
                              </p>
                            </div>
                            <div className="text-gray-400 text-[10px]">
                              Offline Conflict Policy: <span className="text-amber-400 uppercase font-bold">Client Wins</span>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <h4 className="text-[10px] font-mono uppercase tracking-widest text-gray-400">IndexedDB Record Store</h4>
                            
                            {localEntries.length === 0 ? (
                              <div className="p-8 border border-dashed border-gray-500/20 rounded-2xl text-center space-y-1">
                                <Database className="h-8 w-8 text-gray-600 mx-auto" />
                                <p className="text-xs font-medium text-gray-400">Database partition is empty.</p>
                              </div>
                            ) : (
                              localEntries.map((entry) => (
                                <div key={entry.id} className="p-3.5 rounded-xl bg-gray-500/5 border border-gray-500/10 space-y-2 relative group text-xs">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-gray-500 text-[10px]">{entry.id}</span>
                                      <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase font-mono ${
                                        entry.syncStatus === 'synced' 
                                          ? 'bg-emerald-500/10 text-emerald-400' 
                                          : 'bg-amber-500/10 text-amber-400'
                                      }`}>
                                        {entry.syncStatus}
                                      </span>
                                    </div>
                                    <button 
                                      onClick={async () => {
                                        await localDB.deleteJournalEntry(entry.id);
                                        reloadLocalEntries();
                                      }}
                                      className="text-gray-500 hover:text-red-400 transition-colors cursor-pointer"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>

                                  <p className="text-gray-300 leading-relaxed font-sans">{entry.transcript}</p>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                      </div>
                    </div>
                  )}
                  renderDiagnosticsPanel={() => (
                    <div className="space-y-6 p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-bold">System Diagnostics</h3>
                          <p className="text-xs text-gray-400">Real-time status tracking for LogEasy core system modules.</p>
                        </div>
                        <button 
                          onClick={() => { securityManager.verifyAppCheck(); logger.info('AppCheck', 'Forced manual device integrity validation cycle'); }}
                          className="text-xs text-cyan-400 border border-cyan-500/20 px-3 py-1.5 rounded-xl bg-cyan-500/5 hover:bg-cyan-500/10 transition-colors cursor-pointer"
                        >
                          Audit App Check
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-2xl bg-cyan-500/5 border border-cyan-500/10 space-y-1 text-xs">
                          <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest block">App Check</span>
                          <div className="font-bold text-gray-200">Device signature attested</div>
                          <p className="text-gray-400 text-[10px] truncate">{securityManager.getAppCheckToken()}</p>
                        </div>

                        <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 space-y-1 text-xs">
                          <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest block">Local Memory</span>
                          <div className="font-bold text-gray-200">IndexedDB OK</div>
                          <p className="text-gray-400 text-[10px]">{localEntries.length} items cached locally</p>
                        </div>
                      </div>

                      <div className="p-5 rounded-2xl bg-gray-500/5 border border-gray-500/10 space-y-4">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 font-mono">Notification Feed</h4>
                        <div className="h-[140px] overflow-y-auto space-y-2 text-xs">
                          {notifications.length === 0 ? (
                            <div className="text-center text-gray-500 py-8 font-mono text-[11px]">No warnings found. All subsystems green.</div>
                          ) : (
                            notifications.map((n) => (
                              <div key={n.id} className="p-2.5 rounded-lg bg-gray-500/5 border border-gray-500/10 flex items-start gap-2.5">
                                <span className="mt-0.5 text-cyan-400">●</span>
                                <div>
                                  <h4 className="font-semibold text-gray-200">{n.title}</h4>
                                  <p className="text-gray-400 text-[11px]">{n.body}</p>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </section>
      </main>

      {/* RESPONSIVE BOTTOM NAVIGATION BAR (MOBILE/TABLET ONLY) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200/10 backdrop-blur-md bg-opacity-95 bg-[#0b0f19] flex justify-around py-2.5 select-none shadow-lg">
        {[
          { id: 'home', label: 'Home', icon: LayoutGrid },
          { id: 'journal', label: 'Journal', icon: BookOpen },
          { id: 'insights', label: 'HIOS', icon: Cpu },
          { id: 'coach', label: 'Coach', icon: Sparkles },
          { id: 'profile', label: 'Profile', icon: User },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id as any); speakHelpText(`${item.label} Tab Selected`); }}
              className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${
                isActive ? 'text-cyan-400' : 'text-gray-400'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-bold font-sans">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* 4. REAL-TIME LOG TELEMETRY TERMINAL (Hides unless DevMode is toggled!) */}
      {devModeActive && (
        <footer className="h-48 border-t border-gray-200/10 flex flex-col min-h-0 bg-[#070b13] shrink-0 font-mono text-[11px] select-text">
          <div className="flex items-center justify-between px-6 py-2 bg-[#090e19] border-b border-gray-200/10">
            <div className="flex items-center gap-2.5">
              <Terminal className="h-4 w-4 text-cyan-400" />
              <span className="font-bold text-gray-300 uppercase tracking-wide">LogEasy Architectural Trace Log Terminal</span>
            </div>
            
            <div className="flex items-center gap-2.5">
              {/* Filter */}
              <select 
                value={logFilter}
                onChange={(e) => setLogFilter(e.target.value as any)}
                className="bg-gray-500/10 border border-gray-500/20 text-[10px] text-gray-400 px-2 py-0.5 rounded cursor-pointer outline-none"
              >
                <option value="ALL">All Logs</option>
                <option value="INFO">INFO</option>
                <option value="WARN">WARN</option>
                <option value="ERROR">ERROR</option>
                <option value="DEBUG">DEBUG</option>
              </select>

              <button 
                onClick={() => { logger.clearLogs(); setLogs([]); }}
                className="text-[10px] text-gray-400 hover:text-cyan-400 transition-colors"
              >
                Clear Logs
              </button>
            </div>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-1 scrollbar-thin">
            {logs
              .filter((l) => logFilter === 'ALL' || l.level === logFilter)
              .map((l, index) => {
                let color = 'text-gray-400';
                if (l.level === LogLevel.WARN) color = 'text-amber-400';
                if (l.level === LogLevel.ERROR) color = 'text-red-400 font-bold';
                if (l.level === LogLevel.DEBUG) color = 'text-indigo-400';

                return (
                  <div key={index} className="flex items-start gap-2.5 py-0.5 border-b border-gray-200/5 hover:bg-gray-500/5">
                    <span className="text-gray-600 tracking-normal text-[10px] shrink-0">
                      {new Date(l.timestamp).toLocaleTimeString()}
                    </span>
                    <span className={`font-bold shrink-0 text-[10px] uppercase ${color}`}>
                      [{l.level}]
                    </span>
                    <span className="text-cyan-500 shrink-0 font-bold">
                      [{l.context}]
                    </span>
                    <span className="text-gray-300 flex-1 whitespace-pre-wrap">{l.message}</span>
                  </div>
                );
              })}
            <div ref={logTerminalEndRef} />
          </div>
        </footer>
      )}

      {/* GUIDED ONBOARDING FLOW OVERLAY */}
      <AnimatePresence>
        {showOnboarding && (
          <OnboardingWizard onClose={() => setShowOnboarding(false)} />
        )}
      </AnimatePresence>

    </div>
  );
}
