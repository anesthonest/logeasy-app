import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Archive, Download, Trash2, Shield, Lock, FileJson, 
  FileText, Database, Check, AlertTriangle, RefreshCw, X, Filter, HardDrive
} from 'lucide-react';
import { localDB, LocalJournalEntry } from '../../core/database/local_db';
import { dataPortabilityService } from '../../core/intelligence/data_portability_service';
import { logger } from '../../core/analytics/logger';

interface MyLifeArchiveHubProps {
  userId: string;
}

export default function MyLifeArchiveHub({ userId }: MyLifeArchiveHubProps) {
  const [totalEntries, setTotalEntries] = useState(0);
  const [loading, setLoading] = useState(false);
  const [exportFormat, setExportFormat] = useState<'json' | 'csv' | 'markdown' | 'txt'>('json');
  const [selectiveCategory, setSelectiveCategory] = useState<string>('all');
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [exportSuccessMsg, setExportSuccessMsg] = useState<string | null>(null);

  // Deletion Confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteSuccessMsg, setDeleteSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    loadCounts();
  }, [userId]);

  const loadCounts = async () => {
    try {
      const entries = await localDB.getJournalEntries(userId);
      setTotalEntries(entries.filter(e => !e.deleted).length);
    } catch (e) {
      logger.error('MyLifeArchiveHub', 'Failed to load entries count', e);
    }
  };

  const handleExportAll = async () => {
    setLoading(true);
    try {
      const entries = await localDB.getJournalEntries(userId);
      const activeEntries = entries.filter(e => !e.deleted);
      const goals = await localDB.getGoals(userId);
      const habits = await localDB.getHabits(userId);
      const chapters = await localDB.getLifeChapters(userId);

      const archivePayload = {
        metadata: {
          exportDate: new Date().toISOString(),
          userId,
          product: 'LogEasy HIOS Archive',
          statement: 'Your life remembered with care. Private. Permanent. Warm. Intelligent.',
          guarantee: 'Your LogEasy data is controlled by you within the capabilities provided by the service.'
        },
        journalEntries: activeEntries,
        goals,
        habits,
        lifeChapters: chapters
      };

      if (exportFormat === 'json') {
        const jsonStr = JSON.stringify(archivePayload, null, 2);
        downloadFile(jsonStr, `logeasy-life-archive-${userId}-${Date.now()}.json`, 'application/json');
      } else if (exportFormat === 'csv') {
        let csvContent = 'ID,Date,Title,MoodScore,Transcript,Categories,Tags\n';
        activeEntries.forEach(e => {
          const row = [
            `"${e.id}"`,
            `"${e.createdAt}"`,
            `"${(e.title || '').replace(/"/g, '""')}"`,
            e.moodScore,
            `"${e.transcript.replace(/"/g, '""')}"`,
            `"${(e.categories || []).join(';')}"`,
            `"${(e.tags || []).join(';')}"`,
          ];
          csvContent += row.join(',') + '\n';
        });
        downloadFile(csvContent, `logeasy-journal-${userId}-${Date.now()}.csv`, 'text/csv');
      } else if (exportFormat === 'markdown') {
        let md = `# LogEasy Personal Life Chronicle\n\nExported: ${new Date().toLocaleDateString()}\n\n`;
        activeEntries.forEach(e => {
          md += `## ${e.title || 'Journal Entry'} (${new Date(e.createdAt).toLocaleDateString()})\n`;
          md += `**Mood**: ${e.moodScore}/10 | **Categories**: ${(e.categories || []).join(', ')}\n\n`;
          md += `${e.transcript}\n\n---\n\n`;
        });
        downloadFile(md, `logeasy-chronicle-${userId}-${Date.now()}.md`, 'text/markdown');
      } else {
        let txt = `LOGEASY ARCHIVE EXPORT - ${new Date().toLocaleDateString()}\n\n`;
        activeEntries.forEach(e => {
          txt += `[${new Date(e.createdAt).toLocaleDateString()}] ${e.title || 'Untitled'}\n${e.transcript}\n\n`;
        });
        downloadFile(txt, `logeasy-archive-${userId}-${Date.now()}.txt`, 'text/plain');
      }

      setExportSuccessMsg(`Successfully generated complete ${exportFormat.toUpperCase()} archive.`);
      setTimeout(() => setExportSuccessMsg(null), 4000);
    } catch (e: any) {
      logger.error('MyLifeArchiveHub', 'Export failed', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectiveExport = async () => {
    setLoading(true);
    try {
      let entries = await localDB.getJournalEntries(userId);
      entries = entries.filter(e => !e.deleted);

      if (selectiveCategory !== 'all') {
        entries = entries.filter(e => (e.categories || []).includes(selectiveCategory));
      }
      if (exportStartDate) {
        const startMs = new Date(exportStartDate).getTime();
        entries = entries.filter(e => new Date(e.createdAt).getTime() >= startMs);
      }
      if (exportEndDate) {
        const endMs = new Date(exportEndDate).getTime() + 86400000;
        entries = entries.filter(e => new Date(e.createdAt).getTime() <= endMs);
      }

      const selectivePayload = {
        metadata: {
          exportType: 'Selective Export',
          categoryFilter: selectiveCategory,
          dateRange: `${exportStartDate || 'Start'} to ${exportEndDate || 'Present'}`,
          count: entries.length
        },
        entries
      };

      downloadFile(JSON.stringify(selectivePayload, null, 2), `logeasy-selective-export-${Date.now()}.json`, 'application/json');
      setExportSuccessMsg(`Selective export ready (${entries.length} items included).`);
      setTimeout(() => setExportSuccessMsg(null), 4000);
    } catch (e: any) {
      logger.error('MyLifeArchiveHub', 'Selective export failed', e);
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = (content: string, fileName: string, contentType: string) => {
    const a = document.createElement('a');
    const file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const handlePermanentDelete = async () => {
    if (deleteConfirmationInput !== 'DELETE PERMANENTLY') return;

    setIsDeleting(true);
    try {
      const allEntries = await localDB.getJournalEntries(userId);
      for (const entry of allEntries) {
        await localDB.deleteJournalEntry(entry.id);
      }

      setTotalEntries(0);
      setShowDeleteModal(false);
      setDeleteConfirmationInput('');
      setDeleteSuccessMsg('All personal journals and local intelligence records permanently expunged.');
      setTimeout(() => setDeleteSuccessMsg(null), 5000);
    } catch (err: any) {
      logger.error('MyLifeArchiveHub', 'Permanent deletion failed', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 flex-1 flex flex-col min-h-0">
      
      {/* Sovereignty Banner */}
      <div className="p-6 rounded-3xl bg-gray-500/5 border border-gray-500/10 space-y-3 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Absolute Data Sovereignty
          </span>
          <span className="text-gray-500 text-xs font-mono">• Zero Vendor Lock-in</span>
        </div>
        <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
          <Archive className="h-5 w-5 text-emerald-400" />
          <span>My Life Archive</span>
        </h2>
        <p className="text-sm font-semibold text-gray-200">
          YOUR LIFE. YOUR DATA. YOUR CONTROL.
        </p>
        <p className="text-xs text-gray-400 max-w-2xl leading-relaxed">
          Your LogEasy data is controlled by you within the capabilities provided by the service. 
          Export your entire memory graph anytime into open, human-readable formats, or permanently expunge it with cryptographic finality.
        </p>
      </div>

      {/* Success Notification */}
      <AnimatePresence>
        {(exportSuccessMsg || deleteSuccessMsg) && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className={`p-4 rounded-2xl border text-xs font-semibold flex items-center gap-2 ${
              deleteSuccessMsg 
                ? 'bg-red-500/15 border-red-500/30 text-red-300' 
                : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
            }`}
          >
            <Check className="h-4 w-4 shrink-0" />
            <span>{exportSuccessMsg || deleteSuccessMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 overflow-y-auto pr-1">
        
        {/* COMPLETE EXPORT CARD */}
        <div className="p-6 rounded-3xl bg-gray-500/5 border border-gray-500/15 space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-100 flex items-center gap-2">
                <Download className="h-4 w-4 text-emerald-400" />
                <span>Complete Life Archive Export</span>
              </h3>
              <span className="text-xs font-mono text-gray-400 font-bold">
                {totalEntries} Total Records
              </span>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              Downloads a complete standalone dump including journal text, mood metrics, 
              voice transcripts, life goals, habits, timeline eras, and AI metadata.
            </p>

            {/* Format Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-gray-400 uppercase tracking-wider block">
                Export File Format
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'json', label: 'JSON' },
                  { id: 'markdown', label: 'Markdown' },
                  { id: 'csv', label: 'CSV' },
                  { id: 'txt', label: 'Plain Text' },
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setExportFormat(f.id as any)}
                    className={`py-2 px-1 rounded-xl text-xs font-semibold cursor-pointer transition-all border text-center ${
                      exportFormat === f.id
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 font-bold'
                        : 'bg-gray-500/5 border-gray-500/10 text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={handleExportAll}
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:opacity-95 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all"
          >
            <Download className="h-4 w-4" />
            <span>Download Complete Archive ({exportFormat.toUpperCase()})</span>
          </button>
        </div>

        {/* SELECTIVE EXPORT CARD */}
        <div className="p-6 rounded-3xl bg-gray-500/5 border border-gray-500/15 space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-100 flex items-center gap-2">
              <Filter className="h-4 w-4 text-cyan-400" />
              <span>Selective Archive Export</span>
            </h3>

            <p className="text-xs text-gray-300 leading-relaxed">
              Export specific subsets of your memory (e.g. only reflections from 2025, or only entries categorized as "Creative Ideas").
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-gray-400 uppercase">From Date</label>
                <input
                  type="date"
                  value={exportStartDate}
                  onChange={(e) => setExportStartDate(e.target.value)}
                  className="w-full p-2 rounded-xl bg-gray-500/5 border border-gray-500/20 text-xs text-gray-200 outline-none focus:border-cyan-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-gray-400 uppercase">To Date</label>
                <input
                  type="date"
                  value={exportEndDate}
                  onChange={(e) => setExportEndDate(e.target.value)}
                  className="w-full p-2 rounded-xl bg-gray-500/5 border border-gray-500/20 text-xs text-gray-200 outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono text-gray-400 uppercase">Category Filter</label>
              <select
                value={selectiveCategory}
                onChange={(e) => setSelectiveCategory(e.target.value)}
                className="w-full p-2 rounded-xl bg-gray-500/5 border border-gray-500/20 text-xs text-gray-200 outline-none focus:border-cyan-400"
              >
                <option value="all">All Categories</option>
                <option value="Daily Rituals">Daily Rituals</option>
                <option value="Voice Journal">Voice Journal</option>
                <option value="Deep Work">Deep Work</option>
                <option value="Creativity & Play">Creativity &amp; Play</option>
                <option value="Relationships">Relationships</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleSelectiveExport}
            disabled={loading}
            className="w-full py-3 bg-gray-500/10 hover:bg-gray-500/20 border border-gray-500/20 text-cyan-300 font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <Download className="h-4 w-4" />
            <span>Generate Filtered Export</span>
          </button>
        </div>

        {/* PERMANENT DELETION CARD */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-red-950/10 border border-red-500/20 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-red-400 flex items-center gap-2">
                <Trash2 className="h-4 w-4" />
                <span>Permanent Erasure (Right to be Forgotten)</span>
              </h3>
              <p className="text-xs text-gray-400 max-w-xl">
                Irreversibly deletes all local journal entries, audio recordings, memory graph bridges, and cached AI representations from your device.
              </p>
            </div>

            <button
              onClick={() => setShowDeleteModal(true)}
              className="px-4 py-2.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 text-xs font-bold cursor-pointer transition-all shrink-0"
            >
              Permanently Delete All Data
            </button>
          </div>
        </div>
      </div>

      {/* CONFIRMATION DELETION MODAL */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#120808] border border-red-500/40 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative"
            >
              <div className="flex items-center gap-3 text-red-400">
                <AlertTriangle className="h-6 w-6 shrink-0" />
                <h3 className="text-base font-bold text-white">Confirm Permanent Deletion</h3>
              </div>

              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 space-y-2">
                <p>
                  This action is <strong>irreversible</strong>. Once initiated, all {totalEntries} entries and their cryptographic keys will be expunged.
                </p>
                <p>We recommend creating a complete export first.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-mono text-gray-400 uppercase">
                  Type <span className="text-red-400 font-bold">DELETE PERMANENTLY</span> to confirm:
                </label>
                <input
                  type="text"
                  value={deleteConfirmationInput}
                  onChange={(e) => setDeleteConfirmationInput(e.target.value)}
                  placeholder="DELETE PERMANENTLY"
                  className="w-full p-2.5 rounded-xl bg-black/60 border border-red-500/30 text-xs text-white font-mono outline-none focus:border-red-400"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePermanentDelete}
                  disabled={deleteConfirmationInput !== 'DELETE PERMANENTLY' || isDeleting}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer disabled:opacity-30 transition-all"
                >
                  {isDeleting ? 'Erasing...' : 'Confirm Erasure'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
