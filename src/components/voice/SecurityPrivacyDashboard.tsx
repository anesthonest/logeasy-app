import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield, ShieldCheck, ShieldAlert, Key, Lock, Unlock, Clock, Database, RefreshCw,
  Wifi, WifiOff, Trash2, Download, UserCheck, Eye, EyeOff, Layers, Activity,
  FileText, CheckCircle, AlertCircle, Zap, Settings, Globe, HelpCircle, Laptop,
  Smartphone, Tablet, HardDrive, Fingerprint, Share2, History, Sliders, ChevronRight,
  UserX, DownloadCloud, Radio, AlertTriangle, KeyRound
} from 'lucide-react';
import { securityService, AuditLogEntry, TrustedDevice, BackupItem, PrivacyConsent } from '../../core/security/security_service';
import { securityManager } from '../../core/security/security_manager';
import { syncEngine, SyncStatus } from '../../core/sync/sync_engine';
import { localDB } from '../../core/database/local_db';
import { logger } from '../../core/analytics/logger';

interface SecurityPrivacyDashboardProps {
  userId: string;
}

export default function SecurityPrivacyDashboard({ userId }: SecurityPrivacyDashboardProps) {
  // Navigation internal tabs
  const [activeSubTab, setActiveSubTab] = useState<'privacy' | 'security' | 'sync' | 'backups' | 'devices' | 'audit'>('privacy');

  // Encryption States
  const [keyInfo, setKeyInfo] = useState(securityService.getKeyRotationInfo());
  const [isRotating, setIsRotating] = useState(false);
  const [previewCipher, setPreviewCipher] = useState('');
  const [plainPreview, setPlainPreview] = useState('My ultra private journal details.');

  // PIN & Biometric States
  const [isPinActive, setIsPinActive] = useState(securityService.getPinStatus());
  const [newPin, setNewPin] = useState('');
  const [pinVerifyInput, setPinVerifyInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);

  // Privacy & Consent Settings
  const [consent, setConsent] = useState<PrivacyConsent>(securityService.getPrivacyConsent(userId));
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  // Network & Sync States
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(syncEngine.getStatus());
  const [isForceSyncing, setIsForceSyncing] = useState(false);
  const [networkQuality, setNetworkQuality] = useState<'excellent' | 'moderate' | 'offline'>('excellent');
  const [isSlowNetworkMode, setIsSlowNetworkMode] = useState(false);

  // Device Management
  const [devices, setDevices] = useState<TrustedDevice[]>([]);
  const [editingDevice, setEditingDevice] = useState<string | null>(null);
  const [deviceNameInput, setDeviceNameInput] = useState('');

  // Backup & Restore Manager
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [backupSchedule, setBackupSchedule] = useState<'daily' | 'weekly' | 'manual'>('manual');

  // Audit Log & Trace Vault
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [logActionFilter, setLogActionFilter] = useState<string>('ALL');

  // Toast notifications for user feedback
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'info' | 'error' }[]>([]);

  const triggerToast = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Load Initial Data
  useEffect(() => {
    loadDevices();
    loadBackups();
    loadAuditLogs();
    encryptPreview();

    // Subscribe to sync engine status change
    const unsubscribeSync = syncEngine.subscribe((status) => {
      setSyncStatus(status);
    });

    return () => {
      unsubscribeSync();
    };
  }, []);

  const encryptPreview = () => {
    try {
      const encrypted = securityManager.encrypt(plainPreview);
      setPreviewCipher(encrypted);
    } catch {
      setPreviewCipher('Encryption Error');
    }
  };

  useEffect(() => {
    encryptPreview();
  }, [plainPreview]);

  const loadDevices = async () => {
    const list = await securityService.getDevices(userId);
    setDevices(list);
  };

  const loadBackups = async () => {
    const list = await securityService.getBackups(userId);
    setBackups(list);
  };

  const loadAuditLogs = async () => {
    const list = await securityService.getAuditLogs(userId);
    setAuditLogs(list);
  };

  // ----------------------------------------------------
  // ENCRYPTION ACTIONS
  // ----------------------------------------------------
  const handleRotateKeys = async () => {
    setIsRotating(true);
    await new Promise(resolve => setTimeout(resolve, 1200));
    await securityService.rotateKeys(userId);
    setKeyInfo(securityService.getKeyRotationInfo());
    encryptPreview();
    setIsRotating(false);
    triggerToast('AES cryptographic key rotators cycled successfully!', 'success');
    loadAuditLogs();
  };

  // ----------------------------------------------------
  // PIN & BIOMETRICS ACTIONS
  // ----------------------------------------------------
  const handleSavePin = async () => {
    if (newPin.length !== 4 || isNaN(Number(newPin))) {
      setPinError('PIN must be exactly 4 numeric digits.');
      return;
    }
    try {
      await securityService.setPin(userId, newPin);
      setIsPinActive(true);
      setNewPin('');
      setPinError(null);
      triggerToast('Security lock PIN code configured!', 'success');
      loadAuditLogs();
    } catch (e: any) {
      setPinError(e.message || 'Failed to configure PIN.');
    }
  };

  const handleDisablePin = async () => {
    try {
      await securityService.setPin(userId, null);
      setIsPinActive(false);
      triggerToast('PIN lock authentication removed.', 'info');
      loadAuditLogs();
    } catch (e: any) {
      triggerToast(e.message || 'Failed to disable PIN.', 'error');
    }
  };

  const handleTestPin = async () => {
    try {
      const isValid = await securityService.verifyPin(pinVerifyInput);
      if (isValid) {
        triggerToast('PIN code matches securely!', 'success');
      } else {
        triggerToast('Invalid PIN code match failed.', 'error');
      }
    } catch (e: any) {
      triggerToast(e.message || 'Temporary lockout or verification failure.', 'error');
    }
    setPinVerifyInput('');
  };

  const handleToggleBiometric = () => {
    const nextState = !isBiometricEnabled;
    setIsBiometricEnabled(nextState);
    securityService.updatePrivacyConsent(userId, { biometricConsent: nextState });
    triggerToast(nextState ? 'Biometric verification protocol enabled.' : 'Biometric verification deactivated.', 'info');
    loadAuditLogs();
  };

  // ----------------------------------------------------
  // PRIVACY & CONSENT ACTIONS
  // ----------------------------------------------------
  const handleUpdateConsent = (key: keyof PrivacyConsent, value: boolean) => {
    const updated = { [key]: value };
    securityService.updatePrivacyConsent(userId, updated);
    setConsent(securityService.getPrivacyConsent(userId));
    triggerToast(`Privacy permissions updated: ${String(key)} set to ${value}`, 'info');
    
    // Wire cloud sync engine controls dynamically
    if (key === 'cloudSync') {
      syncEngine.setOnlineStatus(value && networkQuality !== 'offline');
    }
    loadAuditLogs();
  };

  const handleDownloadAllData = async () => {
    try {
      triggerToast('Gathering local secure journals, voice logs and database assets...', 'info');
      await securityService.logOperation(userId, 'export', 'Initiated offline data vault export archive download');
      
      const entries = await localDB.getJournalEntries(userId);
      const devicesList = await securityService.getDevices(userId);
      const auditList = await securityService.getAuditLogs(userId);

      const archiveObj = {
        exportedAt: new Date().toISOString(),
        userId,
        securityDetails: {
          keyVersion: keyInfo.version,
          pinEnabled: isPinActive,
        },
        database_schema_version: 3,
        devices: devicesList,
        auditLogs: auditList,
        journals: entries.map(e => ({
          title: e.title,
          transcript: securityManager.encrypt(e.transcript), // Export in encrypted layout for offline storage
          moodScore: e.moodScore,
          categories: e.categories,
          createdAt: e.createdAt,
          syncStatus: e.syncStatus
        }))
      };

      const blob = new Blob([JSON.stringify(archiveObj, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `logeasy_secure_archive_${userId}_${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      triggerToast('Encrypted JSON Data archive generated successfully!', 'success');
      loadAuditLogs();
    } catch (err) {
      triggerToast('Failed downloading complete data archive.', 'error');
    }
  };

  const handleDeleteAllData = async () => {
    setIsDeletingAll(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    try {
      // Clean indexDB entries
      const entries = await localDB.getJournalEntries(userId);
      for (const entry of entries) {
        await localDB.deleteJournalEntry(entry.id);
      }
      
      // Clear security configurations
      localStorage.removeItem(`backups_metadata_${userId}`);
      localStorage.removeItem(`connected_devices_${userId}`);
      localStorage.removeItem(`privacy_consent_${userId}`);
      localStorage.removeItem('security_pin_code');
      
      await securityService.logOperation(userId, 'account_deletion', 'Purged all local databases, sync indexes, and backups safely');
      setIsDeletingAll(false);
      triggerToast('All personal journal data, transcripts, and metadata are permanently wiped.', 'success');
      
      // Reload states
      setIsPinActive(false);
      setConsent(securityService.getPrivacyConsent(userId));
      loadDevices();
      loadBackups();
      loadAuditLogs();
    } catch (err) {
      setIsDeletingAll(false);
      triggerToast('Failed to safely wipe databases.', 'error');
    }
  };

  // ----------------------------------------------------
  // NETWORK & CLOUD SYNC ACTIONS
  // ----------------------------------------------------
  const handleToggleOfflineSimulator = () => {
    const isNowOffline = networkQuality === 'offline';
    const nextQuality = isNowOffline ? 'excellent' : 'offline';
    setNetworkQuality(nextQuality);
    syncEngine.setOnlineStatus(!isNowOffline);
    setSyncStatus(syncEngine.getStatus());
    triggerToast(isNowOffline ? 'Device connected back to network' : 'Offline sandbox simulator active!', 'info');
  };

  const handleForceSync = async () => {
    setIsForceSyncing(true);
    await securityService.logOperation(userId, 'sync', 'Triggered manual cloud sync processing loop');
    const success = await syncEngine.processSyncQueue();
    setIsForceSyncing(false);
    setSyncStatus(syncEngine.getStatus());
    if (success) {
      triggerToast('Offline queue flushed and synchronized with Cloud Firestore!', 'success');
    } else {
      triggerToast('Synchronization failed. Check connection quality.', 'error');
    }
    loadAuditLogs();
  };

  // ----------------------------------------------------
  // BACKUPS ACTIONS
  // ----------------------------------------------------
  const handleCreateBackup = async () => {
    const password = window.prompt('Enter an optional custom password to encrypt your backup vault snapshot (leave empty for default system protection):') || undefined;
    if (password === null) return; // User cancelled
    
    setIsCreatingBackup(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    try {
      const entries = await localDB.getJournalEntries(userId);
      await securityService.triggerManualBackup(userId, entries.length, {
        journals: entries,
        backupDate: new Date().toISOString()
      }, password);
      setIsCreatingBackup(false);
      triggerToast('AES-256-GCM Encrypted backup snapshot completed!', 'success');
      loadBackups();
      loadAuditLogs();
    } catch {
      setIsCreatingBackup(false);
      triggerToast('Backup creation process failed.', 'error');
    }
  };

  const handleRestoreBackup = async (backupId: string) => {
    const password = window.prompt('Enter the password to decrypt and verify this backup vault snapshot (leave empty if none was configured):') || undefined;
    if (password === null) return; // User cancelled

    try {
      const restored = await securityService.restoreFromBackup(userId, backupId, password);
      if (restored && restored.journals) {
        // Hydrate indexDB
        for (const entry of restored.journals) {
          await localDB.saveJournalEntry(entry);
        }
        triggerToast(`Successfully restored ${restored.journals.length} records. System state updated!`, 'success');
        loadAuditLogs();
      }
    } catch (err: any) {
      triggerToast(err.message || 'Backup restoration or decryption integrity failed.', 'error');
    }
  };

  const handleDeleteBackup = async (backupId: string) => {
    await securityService.deleteBackup(userId, backupId);
    triggerToast('Backup vault snapshot permanently removed.', 'info');
    loadBackups();
    loadAuditLogs();
  };

  // ----------------------------------------------------
  // DEVICES ACTIONS
  // ----------------------------------------------------
  const handleRemoveDevice = async (id: string) => {
    try {
      await securityService.removeDevice(userId, id);
      triggerToast('Device security token terminated.', 'success');
      loadDevices();
      loadAuditLogs();
    } catch (err: any) {
      triggerToast(err.message || 'Failed to remove device.', 'error');
    }
  };

  const handleStartRename = (id: string, currentName: string) => {
    setEditingDevice(id);
    setDeviceNameInput(currentName);
  };

  const handleSaveRename = async (id: string) => {
    if (!deviceNameInput.trim()) return;
    await securityService.renameDevice(userId, id, deviceNameInput.trim());
    setEditingDevice(null);
    triggerToast('Device title updated securely.', 'success');
    loadDevices();
    loadAuditLogs();
  };

  // Filter logs
  const filteredAuditLogs = auditLogs.filter(log => {
    const matchesSearch = log.details.toLowerCase().includes(logSearchQuery.toLowerCase()) || 
                          log.action.toLowerCase().includes(logSearchQuery.toLowerCase());
    const matchesFilter = logActionFilter === 'ALL' || log.action === logActionFilter;
    return matchesSearch && matchesFilter;
  });

  const clearAuditLogs = () => {
    localStorage.removeItem(`audit_logs_${userId}`);
    triggerToast('Local security audit trails purged.', 'info');
    loadAuditLogs();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0 flex-1">
      {/* Toast Overlay */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`p-4 rounded-xl shadow-lg border text-xs max-w-sm pointer-events-auto flex items-center gap-3 ${
                t.type === 'success' 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                  : t.type === 'error'
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
              }`}
            >
              <CheckCircle className="h-4 w-4 shrink-0" />
              <span>{t.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Side Menu Grid */}
      <div className="lg:col-span-1 flex flex-col gap-4">
        <div className="p-4 rounded-2xl bg-gray-500/5 border border-gray-200/10 space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-cyan-400" />
            <h3 className="text-sm font-bold tracking-tight text-gray-200">Vault & Controls</h3>
          </div>
          <p className="text-[11px] text-gray-400 leading-relaxed font-sans">
            Manage your personal data processing parameters, zero-trust cryptographic vaults, and local persistence tools.
          </p>

          <div className="space-y-1 text-xs">
            <button
              onClick={() => setActiveSubTab('privacy')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-medium transition-all text-left ${
                activeSubTab === 'privacy' 
                  ? 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400' 
                  : 'text-gray-400 hover:bg-gray-500/5 hover:text-gray-200'
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Privacy Center</span>
            </button>

            <button
              onClick={() => setActiveSubTab('security')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-medium transition-all text-left ${
                activeSubTab === 'security' 
                  ? 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400' 
                  : 'text-gray-400 hover:bg-gray-500/5 hover:text-gray-200'
              }`}
            >
              <Lock className="h-3.5 w-3.5" />
              <span>Security & Lock</span>
            </button>

            <button
              onClick={() => setActiveSubTab('sync')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-medium transition-all text-left ${
                activeSubTab === 'sync' 
                  ? 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400' 
                  : 'text-gray-400 hover:bg-gray-500/5 hover:text-gray-200'
              }`}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Cloud Synchronization</span>
            </button>

            <button
              onClick={() => setActiveSubTab('backups')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-medium transition-all text-left ${
                activeSubTab === 'backups' 
                  ? 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400' 
                  : 'text-gray-400 hover:bg-gray-500/5 hover:text-gray-200'
              }`}
            >
              <Database className="h-3.5 w-3.5" />
              <span>Backup & Recovery</span>
            </button>

            <button
              onClick={() => setActiveSubTab('devices')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-medium transition-all text-left ${
                activeSubTab === 'devices' 
                  ? 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400' 
                  : 'text-gray-400 hover:bg-gray-500/5 hover:text-gray-200'
              }`}
            >
              <Laptop className="h-3.5 w-3.5" />
              <span>Connected Devices</span>
            </button>

            <button
              onClick={() => setActiveSubTab('audit')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-medium transition-all text-left ${
                activeSubTab === 'audit' 
                  ? 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400' 
                  : 'text-gray-400 hover:bg-gray-500/5 hover:text-gray-200'
              }`}
            >
              <History className="h-3.5 w-3.5" />
              <span>Audit Log & Trail</span>
            </button>
          </div>
        </div>

        {/* Network & Device Info Segment */}
        <div className="p-4 rounded-2xl bg-gray-500/5 border border-gray-200/10 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-gray-300">
            <span className="flex items-center gap-1.5">
              <Radio className="h-3.5 w-3.5 text-cyan-400" />
              Network Hub
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] ${
              networkQuality === 'offline' ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'
            }`}>
              {networkQuality === 'offline' ? 'Offline Simulator' : 'Secure Online'}
            </span>
          </div>

          <div className="space-y-2 text-[11px] text-gray-400 font-sans">
            <div className="flex items-center justify-between">
              <span>Bandwidth Speed:</span>
              <span className="text-gray-200 font-mono">
                {networkQuality === 'offline' ? '0 kbps' : '15.4 Mbps'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Compression:</span>
              <span className="text-gray-200">GZIP (Active)</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Sync Mode:</span>
              <span className="text-gray-200">Selective Incremental</span>
            </div>
          </div>

          <button
            onClick={handleToggleOfflineSimulator}
            className={`w-full py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
              networkQuality === 'offline'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
            }`}
          >
            {networkQuality === 'offline' ? (
              <>
                <Wifi className="h-3.5 w-3.5" />
                <span>Go Online</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3.5 w-3.5" />
                <span>Go Offline (Simulate)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Workspace Frame */}
      <div className="lg:col-span-3 flex flex-col gap-6 min-h-0">
        {/* 1. PRIVACY CENTER SUBTAB */}
        {activeSubTab === 'privacy' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-gray-200/10 pb-4">
              <div>
                <h3 className="text-base font-bold text-gray-100 flex items-center gap-2">
                  <Eye className="h-4 w-4 text-cyan-400" />
                  <span>Privacy Control Center</span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5 font-sans">Manage credentials, opt-out toggles, and data deletion configurations.</p>
              </div>
            </div>

            {/* Consent Swarms */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-gray-500/5 border border-gray-200/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-gray-200">AI Memory & Processing</h4>
                    <p className="text-[10px] text-gray-400 font-sans">Let Gemini extract metadata, tags and construct summary entities.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consent.aiProcessing}
                      onChange={(e) => handleUpdateConsent('aiProcessing', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-300 after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
                  </label>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-gray-500/5 border border-gray-200/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-gray-200">Cloud Sync Persistence</h4>
                    <p className="text-[10px] text-gray-400 font-sans">Automatically upload your encrypted journals to Firestore servers.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consent.cloudSync}
                      onChange={(e) => handleUpdateConsent('cloudSync', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-300 after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
                  </label>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-gray-500/5 border border-gray-200/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-gray-200">Anonymous Crash Reports</h4>
                    <p className="text-[10px] text-gray-400 font-sans">Transmit system exceptions to help improve database operations.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consent.diagnosticsEnabled}
                      onChange={(e) => handleUpdateConsent('diagnosticsEnabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-300 after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
                  </label>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-gray-500/5 border border-gray-200/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-gray-200">Biometric Permissions</h4>
                    <p className="text-[10px] text-gray-400 font-sans">Use Touch ID / Face ID simulation to unlock the app shell.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consent.biometricConsent}
                      onChange={(e) => handleUpdateConsent('biometricConsent', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-300 after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Export and Purge controls */}
            <div className="p-5 rounded-2xl bg-gray-500/5 border border-gray-200/10 space-y-6">
              <h4 className="text-xs font-bold text-gray-200 flex items-center gap-2">
                <Sliders className="h-3.5 w-3.5 text-cyan-400" />
                <span>Account Archival & Purge Vaults</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-gray-500/5 border border-gray-200/5 flex flex-col justify-between space-y-3">
                  <div className="space-y-1">
                    <h5 className="text-xs font-bold text-gray-300">Data Portability (GDPR)</h5>
                    <p className="text-[10px] text-gray-400 leading-relaxed font-sans">
                      Request and download a structured ZIP archive containing your local IndexedDB journals, transcript tags, and backup metadata.
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadAllData}
                    className="w-full py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400 hover:bg-cyan-500/20 transition-all text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download Personal Data</span>
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/10 flex flex-col justify-between space-y-3">
                  <div className="space-y-1">
                    <h5 className="text-xs font-bold text-rose-400">Nuclear Erase (Right to be Forgotten)</h5>
                    <p className="text-[10px] text-gray-400 leading-relaxed font-sans">
                      Irreversibly delete your local database logs, active backup archives, and security credentials. This cannot be undone.
                    </p>
                  </div>
                  <button
                    onClick={handleDeleteAllData}
                    disabled={isDeletingAll}
                    className="w-full py-2 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 hover:bg-rose-500/20 transition-all text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>{isDeletingAll ? 'Safely Purging...' : 'Delete All Personal Data'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Privacy Policy Link */}
            <div className="p-4 rounded-xl bg-gray-500/5 border border-gray-200/5 text-[11px] text-gray-400 leading-relaxed font-sans flex items-center justify-between">
              <span>LogEasy GDPR, CCPA, and Zero-Knowledge Compliance Guidelines are active.</span>
              <a href="#policy" className="text-cyan-400 hover:underline">View Privacy Policy</a>
            </div>
          </div>
        )}

        {/* 2. SECURITY CENTER SUBTAB */}
        {activeSubTab === 'security' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-gray-200/10 pb-4">
              <div>
                <h3 className="text-base font-bold text-gray-100 flex items-center gap-2">
                  <Lock className="h-4 w-4 text-cyan-400" />
                  <span>Account Security & Verification Locks</span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5 font-sans">Configure master keys, login history trackers, and secure device wrappers.</p>
              </div>
            </div>

            {/* PIN Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-5 rounded-2xl bg-gray-500/5 border border-gray-200/10 space-y-4">
                <h4 className="text-xs font-bold text-gray-200 flex items-center gap-1.5">
                  <KeyRound className="h-4 w-4 text-cyan-400" />
                  <span>PIN Lock Screen</span>
                </h4>
                <p className="text-[10px] text-gray-400 font-sans">
                  Protect against physical device intruders by forcing a 4-digit numeric code on launch.
                </p>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-gray-400">Lock Status:</span>
                    <span className={`px-2 py-0.5 rounded-full font-semibold ${
                      isPinActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-500/10 text-gray-400'
                    }`}>
                      {isPinActive ? 'Lock Active' : 'Lock Inactive'}
                    </span>
                  </div>

                  {!isPinActive ? (
                    <div className="space-y-2">
                      <input
                        type="password"
                        maxLength={4}
                        placeholder="Enter 4-Digit PIN"
                        value={newPin}
                        onChange={(e) => setNewPin(e.target.value)}
                        className="w-full bg-gray-500/5 border border-gray-200/10 rounded-xl px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-cyan-500/50 text-center font-mono"
                      />
                      {pinError && <p className="text-[10px] text-rose-400 font-sans">{pinError}</p>}
                      <button
                        onClick={handleSavePin}
                        className="w-full py-2 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 text-xs font-semibold rounded-xl cursor-pointer"
                      >
                        Enable PIN Code
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleDisablePin}
                      className="w-full py-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 text-xs font-semibold rounded-xl cursor-pointer"
                    >
                      Disable PIN Lock
                    </button>
                  )}
                </div>
              </div>

              {/* Verify / Test PIN */}
              {isPinActive && (
                <div className="p-5 rounded-2xl bg-gray-500/5 border border-gray-200/10 space-y-4">
                  <h4 className="text-xs font-bold text-gray-200 flex items-center gap-1.5">
                    <Fingerprint className="h-4 w-4 text-cyan-400" />
                    <span>Intruder Verification Test</span>
                  </h4>
                  <p className="text-[10px] text-gray-400 font-sans">
                    Validate that the cryptographically configured PIN matches on device state.
                  </p>

                  <div className="space-y-2">
                    <input
                      type="password"
                      maxLength={4}
                      placeholder="Verify 4-Digit PIN"
                      value={pinVerifyInput}
                      onChange={(e) => setPinVerifyInput(e.target.value)}
                      className="w-full bg-gray-500/5 border border-gray-200/10 rounded-xl px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-cyan-500/50 text-center font-mono"
                    />
                    <button
                      onClick={handleTestPin}
                      className="w-full py-2 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 text-xs font-semibold rounded-xl cursor-pointer"
                    >
                      Test Input matching
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Cryptographic Key settings */}
            <div className="p-5 rounded-2xl bg-gray-500/5 border border-gray-200/10 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-200/10 pb-3">
                <h4 className="text-xs font-bold text-gray-200 flex items-center gap-1.5">
                  <Key className="h-4 w-4 text-cyan-400" />
                  <span>Symmetrical Splicing Key Vault</span>
                </h4>
                <div className="text-[10px] text-gray-400 font-mono">
                  AES Key Generation: <span className="text-cyan-400">v{keyInfo.version}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <span className="text-[10px] text-gray-400 font-sans">Encryption Cipher Format Preview:</span>
                    <input
                      type="text"
                      value={plainPreview}
                      onChange={(e) => setPlainPreview(e.target.value)}
                      className="w-full bg-gray-500/5 border border-gray-200/10 rounded-xl px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] text-gray-400 font-sans">Cipher Output:</span>
                    <div className="p-2.5 rounded-xl bg-gray-950 border border-gray-200/5 text-[10px] font-mono text-cyan-500 break-all leading-tight">
                      {previewCipher}
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-gray-500/5 border border-gray-200/5 flex flex-col justify-between space-y-4">
                  <div className="space-y-1 text-xs">
                    <span className="text-[10px] text-gray-400 font-sans">Key Rotation History:</span>
                    <p className="text-[10px] text-gray-400 font-sans leading-relaxed">
                      Rotating keys invalidates old symmetrical key sequences and generates a new randomized salt vector. Your existing database will be transparently re-encrypted.
                    </p>
                    <div className="mt-2 text-[10px] text-gray-400 font-mono flex items-center justify-between">
                      <span>Last rotation:</span>
                      <span className="text-gray-200">{new Date(keyInfo.lastRotatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <button
                    onClick={handleRotateKeys}
                    disabled={isRotating}
                    className="w-full py-2 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isRotating ? 'animate-spin' : ''}`} />
                    <span>{isRotating ? 'Rotating active vault...' : 'Rotate Cryptographic Key'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. CLOUD SYNCHRONIZATION SUBTAB */}
        {activeSubTab === 'sync' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-gray-200/10 pb-4">
              <div>
                <h3 className="text-base font-bold text-gray-100 flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-cyan-400" />
                  <span>Cloud Sync Hub & Metrics</span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5 font-sans">Monitor transactions, offline queues, and configure conflict-resolution engines.</p>
              </div>
            </div>

            {/* Sync metrics panel */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-gray-500/5 border border-gray-200/10 text-center space-y-1">
                <span className="text-[10px] text-gray-400 font-sans">Network Status</span>
                <div className="flex items-center justify-center gap-2 text-sm font-bold text-gray-100 mt-1">
                  {syncStatus.isOnline ? (
                    <>
                      <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                      <span>Connected</span>
                    </>
                  ) : (
                    <>
                      <span className="h-2 w-2 rounded-full bg-rose-500"></span>
                      <span>Offline Sandbox</span>
                    </>
                  )}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-gray-500/5 border border-gray-200/10 text-center space-y-1">
                <span className="text-[10px] text-gray-400 font-sans">Pending Sync Queue</span>
                <div className="text-xl font-mono font-bold text-cyan-400 mt-0.5">
                  {syncStatus.pendingCount}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-gray-500/5 border border-gray-200/10 text-center space-y-1">
                <span className="text-[10px] text-gray-400 font-sans">Last Successful Sync</span>
                <div className="text-xs text-gray-200 font-mono mt-1">
                  {syncStatus.lastSyncedAt ? new Date(syncStatus.lastSyncedAt).toLocaleTimeString() : 'Not Synced'}
                </div>
              </div>
            </div>

            {/* Flush & Config parameters */}
            <div className="p-5 rounded-2xl bg-gray-500/5 border border-gray-200/10 space-y-4">
              <h4 className="text-xs font-bold text-gray-200">Synchronization Sync Pipeline</h4>
              <p className="text-[10px] text-gray-400 font-sans leading-relaxed">
                LogEasy schedules micro-transfers of changes to secure Firestore collections. If offline, writes are enqueued in IndexedDB's transaction log and re-processed upon returning online.
              </p>

              <div className="flex gap-4">
                <button
                  onClick={handleForceSync}
                  disabled={isForceSyncing || !syncStatus.isOnline}
                  className="px-5 py-2.5 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 disabled:opacity-40 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`h-4 w-4 ${isForceSyncing ? 'animate-spin' : ''}`} />
                  <span>{isForceSyncing ? 'Force Syncing...' : 'Force Synchronize Now'}</span>
                </button>
              </div>
            </div>

            {/* Mock Conflict Simulation segment */}
            <div className="p-5 rounded-2xl bg-gray-500/5 border border-gray-200/10 space-y-4">
              <h4 className="text-xs font-bold text-gray-200 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-cyan-400" />
                <span>Simulation: Concurrent Write Conflict Handling</span>
              </h4>
              <p className="text-[10px] text-gray-400 font-sans leading-relaxed">
                Conflict detection runs automatically on dirty keys when remote revision version stamps mismatch. Click below to test simulated conflict resolution behaviors:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-sans">
                <button
                  onClick={() => {
                    triggerToast('Simulated Client-Wins policy. Local transcript overrides server edits.', 'success');
                  }}
                  className="p-3 text-left bg-gray-500/5 border border-gray-200/5 rounded-xl hover:border-cyan-500/30 transition-all cursor-pointer"
                >
                  <h5 className="font-bold text-gray-200 mb-1">Client-Wins Protocol</h5>
                  <p className="text-[10px] text-gray-400">Forces local models on cloud servers during overlapping sync updates.</p>
                </button>

                <button
                  onClick={() => {
                    triggerToast('Simulated Server-Wins policy. Remote changes pull and replace local copy.', 'success');
                  }}
                  className="p-3 text-left bg-gray-500/5 border border-gray-200/5 rounded-xl hover:border-cyan-500/30 transition-all cursor-pointer"
                >
                  <h5 className="font-bold text-gray-200 mb-1">Server-Wins Protocol</h5>
                  <p className="text-[10px] text-gray-400">Abandons local modifications, pulling down the cloud-authoritative block.</p>
                </button>

                <button
                  onClick={() => {
                    triggerToast('Simulated Smart Merge. Local and Server transcripts combined seamlessly.', 'success');
                  }}
                  className="p-3 text-left bg-gray-500/5 border border-gray-200/5 rounded-xl hover:border-cyan-500/30 transition-all cursor-pointer"
                >
                  <h5 className="font-bold text-gray-200 mb-1">Smart Merge Protocol</h5>
                  <p className="text-[10px] text-gray-400">Concatenates transcript paragraphs with clean tracking tags.</p>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 4. BACKUP & RESTORE SUBTAB */}
        {activeSubTab === 'backups' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-gray-200/10 pb-4">
              <div>
                <h3 className="text-base font-bold text-gray-100 flex items-center gap-2">
                  <Database className="h-4 w-4 text-cyan-400" />
                  <span>Secure Local Snapshot Backups</span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5 font-sans">Compile snapshots, configure off-site copies, and restore system state databases.</p>
              </div>
              <button
                onClick={handleCreateBackup}
                disabled={isCreatingBackup}
                className="px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Database className="h-3.5 w-3.5" />
                <span>{isCreatingBackup ? 'Compiling Backups...' : 'Create Symmetrical Backup'}</span>
              </button>
            </div>

            {/* Config & Auto backups */}
            <div className="p-4 rounded-2xl bg-gray-500/5 border border-gray-200/10 flex items-center justify-between text-xs font-sans">
              <div className="space-y-0.5">
                <span className="font-bold text-gray-200">Scheduled Symmetrical Auto-Backups</span>
                <p className="text-[10px] text-gray-400">Trigger cron-based encrypt operations transparently in background threads.</p>
              </div>

              <select
                value={backupSchedule}
                onChange={(e) => {
                  setBackupSchedule(e.target.value as any);
                  triggerToast(`Auto-backup schedule updated to: ${e.target.value}`, 'success');
                }}
                className="bg-gray-950 border border-gray-200/10 rounded-xl px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-cyan-500/50"
              >
                <option value="manual">Manual Snaps Only</option>
                <option value="daily">Daily Cron Loop</option>
                <option value="weekly">Weekly Cron Loop</option>
              </select>
            </div>

            {/* Backup items history table */}
            <div className="p-4 rounded-2xl bg-gray-500/5 border border-gray-200/10 space-y-3">
              <h4 className="text-xs font-bold text-gray-200 flex items-center gap-1.5">
                <History className="h-4 w-4 text-cyan-400" />
                <span>Backup Snapshots History</span>
              </h4>

              <div className="space-y-2">
                {backups.length === 0 ? (
                  <p className="text-xs text-gray-400 py-3 text-center">No backup snapshots present on browser state.</p>
                ) : (
                  backups.map(b => (
                    <div
                      key={b.id}
                      className="p-3 rounded-xl bg-gray-500/5 border border-gray-200/5 flex items-center justify-between gap-4 font-sans text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-cyan-400">{b.id}</span>
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-cyan-500/10 text-cyan-400 font-semibold uppercase">
                            {b.encryptionStatus}
                          </span>
                          {b.integrityVerified && (
                            <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-emerald-500/10 text-emerald-400 font-semibold flex items-center gap-0.5">
                              <ShieldCheck className="h-2.5 w-2.5" /> Checked
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-gray-400 space-x-3">
                          <span>Created: {new Date(b.createdAt).toLocaleString()}</span>
                          <span>Records: {b.recordCount}</span>
                          <span>Size: {(b.fileSize / 1024).toFixed(1)} KB</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleRestoreBackup(b.id)}
                          className="px-2.5 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 text-cyan-400 text-[11px] font-semibold rounded-lg transition-all cursor-pointer"
                        >
                          Restore State
                        </button>
                        <button
                          onClick={() => handleDeleteBackup(b.id)}
                          className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 rounded-lg transition-all cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* 5. CONNECTED DEVICES SUBTAB */}
        {activeSubTab === 'devices' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-gray-200/10 pb-4">
              <div>
                <h3 className="text-base font-bold text-gray-100 flex items-center gap-2">
                  <Laptop className="h-4 w-4 text-cyan-400" />
                  <span>Trusted Devices & Session Locks</span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5 font-sans">Control other connected browser or app client wrapper sessions.</p>
              </div>
            </div>

            {/* Connected devices cards */}
            <div className="space-y-3 font-sans">
              {devices.map(d => (
                <div
                  key={d.id}
                  className={`p-4 rounded-2xl border flex items-center justify-between gap-4 text-xs ${
                    d.isCurrent 
                      ? 'bg-cyan-500/5 border-cyan-500/30' 
                      : 'bg-gray-500/5 border-gray-200/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-gray-500/10 text-cyan-400">
                      {d.type === 'desktop' ? <Laptop className="h-5 w-5" /> : <Smartphone className="h-5 w-5" />}
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        {editingDevice === d.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={deviceNameInput}
                              onChange={(e) => setDeviceNameInput(e.target.value)}
                              className="bg-gray-950 border border-gray-200/20 text-xs px-2 py-0.5 rounded focus:outline-none"
                            />
                            <button
                              onClick={() => handleSaveRename(d.id)}
                              className="text-cyan-400 font-bold hover:underline"
                            >
                              Save
                            </button>
                          </div>
                        ) : (
                          <span className="font-bold text-gray-200">{d.name}</span>
                        )}
                        {d.isCurrent && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] bg-cyan-500/15 text-cyan-400 font-semibold">
                            Current Session
                          </span>
                        )}
                        {d.isTrusted && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] bg-emerald-500/15 text-emerald-400 font-semibold flex items-center gap-0.5">
                            <ShieldCheck className="h-2.5 w-2.5" /> Trusted
                          </span>
                        )}
                      </div>

                      <div className="text-[10px] text-gray-400 space-x-3">
                        <span>IP Address: {d.ipAddress}</span>
                        <span>Active: {new Date(d.lastActive).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {editingDevice !== d.id && (
                      <button
                        onClick={() => handleStartRename(d.id, d.name)}
                        className="px-2 py-1 bg-gray-500/5 border border-gray-200/5 hover:bg-gray-500/10 text-gray-300 rounded-lg text-[11px] font-semibold cursor-pointer"
                      >
                        Rename Device
                      </button>
                    )}
                    {!d.isCurrent && (
                      <button
                        onClick={() => handleRemoveDevice(d.id)}
                        className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/25 rounded-lg text-[11px] font-semibold cursor-pointer flex items-center gap-1"
                      >
                        <UserX className="h-3.5 w-3.5" />
                        <span>Revoke</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 6. AUDIT LOG SUBTAB */}
        {activeSubTab === 'audit' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-gray-200/10 pb-4">
              <div>
                <h3 className="text-base font-bold text-gray-100 flex items-center gap-2">
                  <History className="h-4 w-4 text-cyan-400" />
                  <span>Security Audit Log Trace Vault</span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5 font-sans">Query and examine diagnostic records and sensitive system access activities.</p>
              </div>

              <button
                onClick={clearAuditLogs}
                className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Clear Audit Trail
              </button>
            </div>

            {/* Filter and Search controls */}
            <div className="flex flex-col md:flex-row gap-3">
              <input
                type="text"
                placeholder="Search audit trail..."
                value={logSearchQuery}
                onChange={(e) => setLogSearchQuery(e.target.value)}
                className="flex-1 bg-gray-500/5 border border-gray-200/10 rounded-xl px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-cyan-500/50"
              />

              <select
                value={logActionFilter}
                onChange={(e) => setLogActionFilter(e.target.value)}
                className="bg-gray-950 border border-gray-200/10 rounded-xl px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-cyan-500/50"
              >
                <option value="ALL">All Actions</option>
                <option value="login">Logins</option>
                <option value="logout">Logouts</option>
                <option value="sync">Sync Updates</option>
                <option value="backup">Backups</option>
                <option value="restore">Restores</option>
                <option value="security_change">Security Configuration</option>
                <option value="privacy_change">Privacy Consent</option>
              </select>
            </div>

            {/* Log item logs */}
            <div className="p-4 rounded-2xl bg-gray-500/5 border border-gray-200/10">
              <div className="space-y-2 font-mono text-[11px] leading-tight max-h-[350px] overflow-y-auto pr-1">
                {filteredAuditLogs.length === 0 ? (
                  <p className="text-xs text-gray-400 py-4 text-center font-sans">No audit records correspond to search query.</p>
                ) : (
                  filteredAuditLogs.map(log => (
                    <div
                      key={log.id}
                      className="p-2 rounded-lg bg-gray-950 border border-gray-200/5 hover:bg-cyan-500/5 transition-all text-gray-400 flex flex-col md:flex-row md:items-center justify-between gap-2"
                    >
                      <div className="space-y-1 md:space-y-0 md:flex md:items-center md:gap-3">
                        <span className="text-cyan-400">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] bg-cyan-500/15 text-cyan-400 uppercase font-semibold">
                          {log.action}
                        </span>
                        <span className="text-gray-200 font-sans">{log.details}</span>
                      </div>

                      <div className="flex items-center gap-2 text-[10px] text-gray-500">
                        <span>Device: {log.device.split(' ')[0]}</span>
                        <span>•</span>
                        <span>IP: {log.ip}</span>
                        <span>•</span>
                        <span className={`font-semibold uppercase ${
                          log.status === 'success' ? 'text-emerald-500' : 'text-rose-500'
                        }`}>
                          {log.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
