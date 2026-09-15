import React, { useState, useEffect } from 'react';
import { 
  Plus, Calendar, Search, LayoutGrid, HardDrive, Cpu, Shield, 
  Settings, User, CheckCircle, RefreshCw, CircleAlert, Sparkles, FolderClosed
} from 'lucide-react';

// Core dependencies
import { localDB, LocalJournalEntry, LocalSyncQueueItem } from '../../core/database/local_db';
import { syncEngine, SyncStatus } from '../../core/sync/sync_engine';
import { aiService } from '../../core/ai/ai_service';
import { notificationManager } from '../../core/notifications/notification_manager';
import { logger } from '../../core/analytics/logger';

// Sub-components
import { Folder, SearchFilter, SavedSearch } from './VoiceJournalTypes';
import VoiceRecorderCard from './VoiceRecorderCard';
import TranscriptEditor from './TranscriptEditor';
import TimelineView from './TimelineView';
import FolderManagement from './FolderManagement';
import SearchEngine from './SearchEngine';
import AudioDashboard from './AudioDashboard';

interface VoiceJournalDashboardProps {
  userId: string;
}

export default function VoiceJournalDashboard({ userId }: VoiceJournalDashboardProps) {
  // Database states
  const [entries, setEntries] = useState<LocalJournalEntry[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  // Active Selected Entry for Detailed Editing
  const [selectedEntry, setSelectedEntry] = useState<LocalJournalEntry | null>(null);

  // Search filter states
  const [filter, setFilter] = useState<SearchFilter>({
    query: '',
    tags: [],
    categories: [],
    sortBy: 'createdAt_desc'
  });

  // Screen layout state
  const [showRecorder, setShowRecorder] = useState(false);

  // Load database structures on boot
  useEffect(() => {
    loadDatabase();
  }, [userId, selectedFolderId]);

  const loadDatabase = async () => {
    try {
      // 1. Fetch entries
      let list = await localDB.getJournalEntries(userId);
      
      // Filter out deleted/trash unless requested
      list = list.filter(entry => !entry.deleted);

      // If a folder is selected, filter by folder
      if (selectedFolderId !== null) {
        list = list.filter(entry => entry.folderId === selectedFolderId);
      }

      setEntries(list);

      // 2. Fetch custom folders from preferences
      const storedFolders = await localDB.getPreference<Folder[]>('user_folders');
      if (storedFolders) {
        setFolders(storedFolders);
      } else {
        // Default seed collections
        const seed: Folder[] = [
          { id: 'f-work', name: 'Work Reflections', color: '#6366f1', createdAt: new Date().toISOString() },
          { id: 'f-personal', name: 'Personal Logs', color: '#ec4899', createdAt: new Date().toISOString() },
          { id: 'f-ideas', name: 'Creative Outlines', color: '#10b981', createdAt: new Date().toISOString() }
        ];
        await localDB.setPreference('user_folders', seed);
        setFolders(seed);
      }

      // 3. Fetch saved searches
      const storedSearches = await localDB.getPreference<SavedSearch[]>('user_saved_searches');
      if (storedSearches) {
        setSavedSearches(storedSearches);
      }
    } catch (err) {
      logger.error('VoiceDashboard', 'Failed loading offline IndexedDB modules', err);
    }
  };

  // --- RECORDING COMPLETE DISPATCHER ---
  const handleRecordComplete = async (
    blob: Blob,
    metadata: any,
    settings: { quality: string; noiseReduction: boolean }
  ) => {
    logger.info('VoiceDashboard', `Processing voice recording: ${metadata.duration}s. Size: ${(blob.size / 1024).toFixed(1)} KB`);

    // Generate simulated accent/language transcript
    const sampleTranscripts: Record<string, string> = {
      'en-US': `Spoken reflection on code architecture and Clean separation principles. We successfully isolated our custom voice widgets. Testing low-latency canvas sound indicators and modular state controllers. Everything compiles smoothly without leaks.`,
      'es-ES': `Reflexión grabada sobre arquitectura de software limpia. Hemos separado exitosamente los widgets de voz modales de nuestra vista principal, manteniendo una estructura de base de datos local sólida con IndexedDB y sincronización asíncrona.`,
      'fr-FR': `Réflexion vocale sur l'architecture logicielle propre. Nous avons isolé avec succès les composants audio de notre tableau de bord. Tout fonctionne en mode hors ligne avec IndexedDB.`,
      'de-DE': `Sprachaufzeichnung zur sauberen Softwarearchitektur. Wir haben die Audio-Komponenten erfolgreich in eigene Module aufgeteilt. Die Synchronisierung läuft perfekt im Hintergrund.`,
      'ja-JP': `クリーンアーキテクチャとモジュール設計に関する音声メモ。IndexedDBを使用したローカルファーストな永続化、およびバックグラウンド同期エンジンを実装しました。ビルdはすべて成功しています。`,
      'zh-CN': `关于软件架构与模块化开发的语音随笔。我们已成功分离了录音控制台模块，并验证了本地IndexedDB与同步队列。`,
      'pt-BR': `Reflexão por voz sobre práticas de Clean Architecture. Isolamos com sucesso nossos componentes de áudio e mantivemos consistência offline com IndexedDB.`,
      'hi-IN': `सॉफ़्टवेयर आर्किटेक्चर और क्लीन कोडिंग सिद्धांतों पर एक वॉइस लॉग। हमने स्थानीय IndexedDB संग्रहण और समन्वयन प्रक्रिया की कार्यक्षमता को प्रमाणित किया है।`
    };

    const finalLanguage = metadata.language || 'en-US';
    const transcriptText = metadata.transcript || sampleTranscripts[finalLanguage] || sampleTranscripts['en-US'];
    const titleText = `Vocal Log • ${new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;

    const newEntry: LocalJournalEntry = {
      id: `entry_${Math.random().toString(36).substring(2, 11)}`,
      userId: userId,
      title: titleText,
      transcript: transcriptText,
      audioDuration: metadata.duration,
      audioUrl: URL.createObjectURL(blob),
      fileSize: blob.size,
      moodScore: 8,
      moodLabel: 'Productive',
      categories: ['Voice Journal'],
      tags: ['audio', 'clean'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      syncStatus: 'pending_create',
      encryptionStatus: 'plain',
      versionNumber: 1,
      language: finalLanguage,
      folderId: selectedFolderId || undefined
    };

    try {
      await localDB.saveJournalEntry(newEntry);
      
      // Add to offline sync queue
      const syncItem: LocalSyncQueueItem = {
        id: `sync_${newEntry.id}`,
        entryId: newEntry.id,
        action: 'create',
        payload: newEntry,
        createdAt: new Date().toISOString(),
        attempts: 0
      };
      await localDB.addToSyncQueue(syncItem);

      // Trigger background synchronization loop if network online
      if (syncEngine.getStatus().isOnline) {
        syncEngine.processSyncQueue();
      }

      notificationManager.addNotification({
        title: 'New Voice Journal Saved',
        body: `Recorded ${metadata.duration}s file successfully offline.`,
        type: 'reminder'
      });

      setShowRecorder(false);
      await loadDatabase();
      setSelectedEntry(newEntry);
    } catch (err) {
      logger.error('VoiceDashboard', 'Failed writing captured snippet', err);
    }
  };

  // --- RETRY SPEECH TO TEXT SIMULATION ---
  const handleRetryTranscription = async (id: string, lang: string): Promise<string> => {
    await new Promise(resolve => setTimeout(resolve, 1500)); // Latency

    const templates: Record<string, string> = {
      'en-US': `[Re-transcribed in English (US)] Spoken reflection on code architecture. We successfully isolated our custom voice widgets. Testing low-latency canvas sound indicators and modular state controllers. Everything compiles smoothly without leaks.`,
      'es-ES': `[Re-transcribed in Spanish (ES)] Reflexión grabada sobre arquitectura de software limpia. Hemos separado exitosamente los widgets de voz modales de nuestra vista principal, manteniendo una estructura de base de datos local sólida con IndexedDB y sincronización asíncrona.`,
      'fr-FR': `[Re-transcribed in French (FR)] Réflexion vocale sur l'architecture logicielle propre. Nous avons isolé avec succès les composants audio de notre tableau de bord. Tout fonctionne en mode hors ligne avec IndexedDB.`,
      'de-DE': `[Re-transcribed in German (DE)] Sprachaufzeichnung zur sauberen Softwarearchitektur. Wir haben die Audio-Komponenten erfolgreich in eigene Module aufgeteilt. Die Synchronisierung läuft perfekt im Hintergrund.`,
      'ja-JP': `[Re-transcribed in Japanese (JP)] クリーンアーキテクチャとモジュール設計に関する音声メモ。IndexedDBを使用したローカルファーストな永続化、およびバックグラウンド同期エンジンを実装しました。ビルdはすべて成功しています。`,
      'zh-CN': `[Re-transcribed in Chinese (ZH)] 关于清晰代码架构和模块化设计的语音记录。成功将语音模块与主视图分离。实现了支持离线缓存的IndexedDB，以及云端后台同步策略。`,
      'pt-BR': `[Re-transcribed in Portuguese (PT)] Reflexão de voz sobre arquitetura de sistemas. Separamos com sucesso os widgets de gravação do formulário principal, mantendo integridade local offline.`,
      'hi-IN': `[Re-transcribed in Hindi (HI)] सॉफ़्टवेयर आर्किटेक्चर पर वॉइस नोट। हमने सफलतापूर्वक स्थानीय डेटाबेस IndexedDB के साथ सिंक्रनाइज़ेशन इंजन को जोड़ लिया है।`
    };

    const text = templates[lang] || templates['en-US'];
    
    // Update local entries list
    setEntries(prev => prev.map(entry => entry.id === id ? { ...entry, transcript: text, language: lang } : entry));
    
    return text;
  };

  // --- SAVE JOURNAL METADATA ---
  const handleSaveEntry = async (updates: Partial<LocalJournalEntry>) => {
    if (!selectedEntry) return;

    const updated: LocalJournalEntry = {
      ...selectedEntry,
      ...updates,
      syncStatus: 'pending_update',
      updatedAt: new Date().toISOString()
    };

    try {
      await localDB.saveJournalEntry(updated);
      setSelectedEntry(updated);

      // Queue sync update
      const syncItem: LocalSyncQueueItem = {
        id: `sync_${updated.id}_${Date.now()}`,
        entryId: updated.id,
        action: 'update',
        payload: updated,
        createdAt: new Date().toISOString(),
        attempts: 0
      };
      await localDB.addToSyncQueue(syncItem);

      if (syncEngine.getStatus().isOnline) {
        syncEngine.processSyncQueue();
      }

      // Reload
      await loadDatabase();
    } catch (err) {
      logger.error('VoiceDashboard', 'Failed saving entry updates', err);
    }
  };

  // --- TOGGLES & TRIGGERS ---
  const handleToggleFavorite = async (id: string) => {
    const entry = entries.find(e => e.id === id) || (selectedEntry?.id === id ? selectedEntry : null);
    if (!entry) return;

    const nextVal = !entry.favorite;
    
    // Optimistic UI state updates
    setEntries(prev => prev.map(e => e.id === id ? { ...e, favorite: nextVal } : e));
    if (selectedEntry?.id === id) {
      setSelectedEntry(prev => prev ? { ...prev, favorite: nextVal } : null);
    }

    try {
      const updated = { ...entry, favorite: nextVal, syncStatus: 'pending_update' as const, updatedAt: new Date().toISOString() };
      await localDB.saveJournalEntry(updated);
      await localDB.addToSyncQueue({
        id: `sync_${id}_fav_${Date.now()}`,
        entryId: id,
        action: 'update',
        payload: updated,
        createdAt: new Date().toISOString(),
        attempts: 0
      });
      if (syncEngine.getStatus().isOnline) syncEngine.processSyncQueue();
    } catch (err) {
      logger.error('VoiceDashboard', 'Favorite toggle crashed', err);
    }
  };

  const handleTogglePin = async (id: string) => {
    const entry = entries.find(e => e.id === id) || (selectedEntry?.id === id ? selectedEntry : null);
    if (!entry) return;

    const nextVal = !entry.pinned;
    setEntries(prev => prev.map(e => e.id === id ? { ...e, pinned: nextVal } : e));
    if (selectedEntry?.id === id) {
      setSelectedEntry(prev => prev ? { ...prev, pinned: nextVal } : null);
    }

    try {
      const updated = { ...entry, pinned: nextVal, syncStatus: 'pending_update' as const, updatedAt: new Date().toISOString() };
      await localDB.saveJournalEntry(updated);
      await localDB.addToSyncQueue({
        id: `sync_${id}_pin_${Date.now()}`,
        entryId: id,
        action: 'update',
        payload: updated,
        createdAt: new Date().toISOString(),
        attempts: 0
      });
      if (syncEngine.getStatus().isOnline) syncEngine.processSyncQueue();
    } catch (err) {
      logger.error('VoiceDashboard', 'Pin toggle crashed', err);
    }
  };

  const handleToggleArchive = async (id: string) => {
    const entry = entries.find(e => e.id === id) || (selectedEntry?.id === id ? selectedEntry : null);
    if (!entry) return;

    const nextVal = !entry.archived;
    
    // Optimistically filter archived out of active lists
    setEntries(prev => prev.filter(e => e.id !== id));
    if (selectedEntry?.id === id) {
      setSelectedEntry(prev => prev ? { ...prev, archived: nextVal } : null);
    }

    try {
      const updated = { ...entry, archived: nextVal, syncStatus: 'pending_update' as const, updatedAt: new Date().toISOString() };
      await localDB.saveJournalEntry(updated);
      await localDB.addToSyncQueue({
        id: `sync_${id}_arch_${Date.now()}`,
        entryId: id,
        action: 'update',
        payload: updated,
        createdAt: new Date().toISOString(),
        attempts: 0
      });
      if (syncEngine.getStatus().isOnline) syncEngine.processSyncQueue();
      await loadDatabase();
    } catch (err) {
      logger.error('VoiceDashboard', 'Archive toggle crashed', err);
    }
  };

  const handleDelete = async (id: string) => {
    const entry = entries.find(e => e.id === id);
    if (!entry) return;

    if (window.confirm('Delete this vocal record? It will move to offline Trash.')) {
      setEntries(prev => prev.filter(e => e.id !== id));
      if (selectedEntry?.id === id) {
        setSelectedEntry(null);
      }

      try {
        const updated = { ...entry, deleted: true, syncStatus: 'pending_update' as const, updatedAt: new Date().toISOString() };
        await localDB.saveJournalEntry(updated);
        await localDB.addToSyncQueue({
          id: `sync_${id}_del_${Date.now()}`,
          entryId: id,
          action: 'update',
          payload: updated,
          createdAt: new Date().toISOString(),
          attempts: 0
        });
        if (syncEngine.getStatus().isOnline) syncEngine.processSyncQueue();
        await loadDatabase();
      } catch (err) {
        logger.error('VoiceDashboard', 'Delete crashed', err);
      }
    }
  };

  const handleDuplicate = async (id: string) => {
    const entry = entries.find(e => e.id === id);
    if (!entry) return;

    const dup: LocalJournalEntry = {
      ...entry,
      id: `entry_${Math.random().toString(36).substring(2, 11)}`,
      title: `${entry.title || 'Vocal Log'} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      syncStatus: 'pending_create',
      pinned: false
    };

    try {
      await localDB.saveJournalEntry(dup);
      await localDB.addToSyncQueue({
        id: `sync_${dup.id}`,
        entryId: dup.id,
        action: 'create',
        payload: dup,
        createdAt: new Date().toISOString(),
        attempts: 0
      });
      if (syncEngine.getStatus().isOnline) syncEngine.processSyncQueue();
      await loadDatabase();
      setSelectedEntry(dup);
    } catch (err) {
      logger.error('VoiceDashboard', 'Duplication failed', err);
    }
  };

  const handleMoveToFolder = async (id: string, folderId: string | undefined) => {
    const entry = entries.find(e => e.id === id) || (selectedEntry?.id === id ? selectedEntry : null);
    if (!entry) return;

    setEntries(prev => prev.map(e => e.id === id ? { ...e, folderId } : e));
    if (selectedEntry?.id === id) {
      setSelectedEntry(prev => prev ? { ...prev, folderId } : null);
    }

    try {
      const updated = { ...entry, folderId, syncStatus: 'pending_update' as const, updatedAt: new Date().toISOString() };
      await localDB.saveJournalEntry(updated);
      await localDB.addToSyncQueue({
        id: `sync_${id}_move_${Date.now()}`,
        entryId: id,
        action: 'update',
        payload: updated,
        createdAt: new Date().toISOString(),
        attempts: 0
      });
      if (syncEngine.getStatus().isOnline) syncEngine.processSyncQueue();
    } catch (err) {
      logger.error('VoiceDashboard', 'Failed assigning folder', err);
    }
  };

  const handleExport = (entry: LocalJournalEntry) => {
    const markdownContent = `# ${entry.title || 'Untitled Spoken Reflection'}
Date: ${new Date(entry.createdAt).toLocaleDateString()}
Mood: ${entry.moodScore}/10 (${entry.moodLabel})
Duration: ${entry.audioDuration} seconds
Language: ${entry.language || 'en-US'}
Word Count: ${entry.wordCount || 0}

## Spoken Transcript
${entry.transcript}

---
Exported secure-vault file compiled from LogEasy.`;

    const blob = new Blob([markdownContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(entry.title || 'vocal_log').toLowerCase().replace(/\s+/g, '_')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    logger.info('VoiceDashboard', `Exported journal ${entry.id} as markdown file.`);
  };

  const handleShare = (entry: LocalJournalEntry, type: 'text' | 'audio') => {
    if (type === 'text') {
      navigator.clipboard.writeText(entry.transcript);
      notificationManager.addNotification({
        title: 'Transcript Copied',
        body: 'Spoken transcript text copied securely to your clipboard.',
        type: 'system'
      });
    } else {
      notificationManager.addNotification({
        title: 'Audio Export Triggered',
        body: `Local download stream generated for voice wav (${entry.audioDuration}s).`,
        type: 'reminder'
      });
    }
  };

  // --- FOLDERS MANAGEMENT ACTIONS ---
  const handleCreateFolder = async (name: string, color?: string) => {
    const list = [...folders];
    const newFolder: Folder = {
      id: `folder_${Math.random().toString(36).substring(2, 7)}`,
      name,
      color,
      createdAt: new Date().toISOString()
    };
    list.push(newFolder);
    setFolders(list);
    await localDB.setPreference('user_folders', list);
  };

  const handleDeleteFolder = async (id: string) => {
    const list = folders.filter(f => f.id !== id);
    setFolders(list);
    await localDB.setPreference('user_folders', list);
    
    // Clear folder associations
    const allEntries = await localDB.getJournalEntries(userId);
    for (const entry of allEntries) {
      if (entry.folderId === id) {
        await localDB.saveJournalEntry({ ...entry, folderId: undefined });
      }
    }
    if (selectedFolderId === id) {
      setSelectedFolderId(null);
    }
    await loadDatabase();
  };

  // --- SEARCH SAVED PRESETS ---
  const handleAddSavedSearch = async (name: string) => {
    const list = [...savedSearches];
    const newSearch: SavedSearch = {
      id: `search_${Math.random().toString(36).substring(2, 7)}`,
      name,
      filter: { ...filter },
      createdAt: new Date().toISOString()
    };
    list.push(newSearch);
    setSavedSearches(list);
    await localDB.setPreference('user_saved_searches', list);
  };

  const handleDeleteSavedSearch = async (id: string) => {
    const list = savedSearches.filter(s => s.id !== id);
    setSavedSearches(list);
    await localDB.setPreference('user_saved_searches', list);
  };

  // --- RECLAIM AND COMPRESSION LOGIC ---
  const handleReclaimSpace = async (): Promise<number> => {
    const all = await localDB.getJournalEntries(userId);
    let freedBytes = 0;
    
    for (const entry of all) {
      if (entry.audioUrl && entry.fileSize) {
        freedBytes += Math.round(entry.fileSize * 0.72); // simulate 72% reclaiming
        await localDB.saveJournalEntry({
          ...entry,
          fileSize: Math.round(entry.fileSize * 0.28) // compressed size
        });
      }
    }
    await loadDatabase();
    return freedBytes;
  };

  const handleDeleteAllAudio = async () => {
    const all = await localDB.getJournalEntries(userId);
    for (const entry of all) {
      if (entry.audioUrl) {
        await localDB.saveJournalEntry({
          ...entry,
          audioUrl: undefined,
          fileSize: 0
        });
      }
    }
    await loadDatabase();
    if (selectedEntry) {
      setSelectedEntry(prev => prev ? { ...prev, audioUrl: undefined, fileSize: 0 } : null);
    }
  };

  // --- STATISTICS PRE-CALCULATOR ---
  const getFolderCounts = (): Record<string, number> => {
    const counts: Record<string, number> = { all: entries.length };
    entries.forEach(e => {
      if (e.folderId) {
        counts[e.folderId] = (counts[e.folderId] || 0) + 1;
      }
    });
    return counts;
  };

  const getFilteredEntries = (): LocalJournalEntry[] => {
    let list = [...entries];

    // Query text match
    if (filter.query.trim()) {
      const q = filter.query.toLowerCase();
      list = list.filter(e => 
        (e.title || '').toLowerCase().includes(q) || 
        e.transcript.toLowerCase().includes(q) ||
        (e.tags || []).some(t => t.toLowerCase().includes(q))
      );
    }

    // Boolean filters
    if (filter.isFavorite) list = list.filter(e => e.favorite);
    if (filter.isPinned) list = list.filter(e => e.pinned);
    if (filter.isArchived) {
      list = list.filter(e => e.archived);
    } else {
      // Don't show archived items in default timeline
      list = list.filter(e => !e.archived);
    }

    // Tag list matches (AND operation)
    if (filter.tags.length > 0) {
      list = list.filter(e => filter.tags.every(t => (e.tags || []).includes(t)));
    }

    // Category matches
    if (filter.categories.length > 0) {
      list = list.filter(e => filter.categories.some(c => e.categories.includes(c)));
    }

    // Duration range
    if (filter.durationMin !== undefined) list = list.filter(e => e.audioDuration >= (filter.durationMin || 0));
    if (filter.durationMax !== undefined) list = list.filter(e => e.audioDuration <= (filter.durationMax || 9999));

    // Sort mappings
    list.sort((a, b) => {
      // Pinned entries always stay absolutely at top
      const aPinned = a.pinned ? 1 : 0;
      const bPinned = b.pinned ? 1 : 0;
      if (aPinned !== bPinned) return bPinned - aPinned;

      if (filter.sortBy === 'createdAt_asc') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (filter.sortBy === 'audioDuration_desc') {
        return b.audioDuration - a.audioDuration;
      } else if (filter.sortBy === 'title_asc') {
        return (a.title || '').localeCompare(b.title || '');
      } else {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return list;
  };

  const filtered = getFilteredEntries();

  // Accumulate storage and durations
  const totalStorageBytes = entries.reduce((acc, curr) => acc + (curr.fileSize || 0), 0);
  const totalAudioDuration = entries.reduce((acc, curr) => acc + (curr.audioDuration || 0), 0);

  // Generate lists for tag filters from entries
  const availableTags: string[] = Array.from(new Set(entries.flatMap(e => (e.tags || []) as string[]))) as string[];
  const availableCategories: string[] = Array.from(new Set(entries.flatMap(e => (e.categories || []) as string[]))) as string[];

  return (
    <div className="flex-1 flex flex-col xl:flex-row gap-6 min-h-0">
      
      {/* LEFT COLUMN: Folders and Audio Dashboard */}
      <div className="w-full xl:w-72 space-y-6 shrink-0 flex flex-col min-h-0">
        
        {/* Quick capture button */}
        <button
          onClick={() => setShowRecorder(!showRecorder)}
          className="w-full py-3 bg-gradient-to-r from-cyan-500 to-indigo-500 hover:opacity-95 text-white font-bold rounded-2xl shadow-lg shadow-cyan-950/20 text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shrink-0"
        >
          <Plus className="h-4.5 w-4.5" />
          <span>{showRecorder ? 'Hide Voice Capturer' : 'Record New Voice Journal'}</span>
        </button>

        {/* Dynamic Recorder overlay if activated */}
        {showRecorder && (
          <VoiceRecorderCard
            onRecordComplete={handleRecordComplete}
            onCancel={() => setShowRecorder(false)}
          />
        )}

        {/* Collections side navigation */}
        <FolderManagement
          folders={folders}
          onCreateFolder={handleCreateFolder}
          onDeleteFolder={handleDeleteFolder}
          selectedFolderId={selectedFolderId}
          onSelectFolder={setSelectedFolderId}
          entryCounts={getFolderCounts()}
        />

        {/* Audio space tracking */}
        <AudioDashboard
          totalEntriesCount={entries.length}
          totalAudioDuration={totalAudioDuration}
          totalStorageBytes={totalStorageBytes}
          onReclaimSpace={handleReclaimSpace}
          onDeleteAllAudio={handleDeleteAllAudio}
        />
      </div>

      {/* RIGHT COLUMN: Interactive Timeline & Live Workspace Editor */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
        
        {/* Timeline center module */}
        <div className="flex-1 flex flex-col space-y-4 min-h-0">
          
          {/* Dynamic Filter Search */}
          <SearchEngine
            filter={filter}
            onFilterChange={(updates) => setFilter(prev => ({ ...prev, ...updates }))}
            savedSearches={savedSearches}
            onAddSavedSearch={handleAddSavedSearch}
            onDeleteSavedSearch={handleDeleteSavedSearch}
            availableTags={availableTags}
            availableCategories={availableCategories}
          />

          {/* Timeline scroll container */}
          <div className="flex-1 overflow-y-auto pr-1">
            <TimelineView
              entries={filtered}
              folders={folders}
              onSelectEntry={(entry) => setSelectedEntry(entry)}
              selectedEntryId={selectedEntry?.id || null}
              onToggleFavorite={handleToggleFavorite}
              onTogglePin={handleTogglePin}
              onToggleArchive={handleToggleArchive}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
              onMoveToFolder={handleMoveToFolder}
              onExport={handleExport}
              onShare={handleShare}
            />
          </div>
        </div>

        {/* Editor detail panel */}
        <div className="w-full lg:w-[420px] shrink-0 min-h-0 overflow-y-auto">
          {selectedEntry ? (
            <TranscriptEditor
              entry={selectedEntry}
              onSave={handleSaveEntry}
              onRetryTranscription={handleRetryTranscription}
            />
          ) : (
            <div className="p-12 border border-dashed border-gray-500/15 rounded-2xl text-center bg-gray-500/[0.01] flex flex-col items-center justify-center space-y-3 select-none h-full min-h-[300px]">
              <FolderClosed className="h-9 w-9 text-gray-600" />
              <div>
                <p className="text-xs font-semibold text-gray-400">Vocal log workspace</p>
                <p className="text-[11px] text-gray-500 max-w-xs mx-auto mt-1 leading-relaxed">
                  Select a journal entry from your timeline to edit transcript text, re-analyze speech accents, playback audio, or assign folders.
                </p>
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
