import React, { useState } from 'react';
import { 
  Pin, Star, Archive, Trash2, Calendar, Clock, Copy, Share2, 
  Download, ArrowRightLeft, FolderOpen, Heart, Eye, ArrowUp, ArrowDown 
} from 'lucide-react';
import { LocalJournalEntry } from '../../core/database/local_db';
import { Folder } from './VoiceJournalTypes';
import { logger } from '../../core/analytics/logger';

interface TimelineViewProps {
  entries: LocalJournalEntry[];
  folders: Folder[];
  onSelectEntry: (entry: LocalJournalEntry) => void;
  selectedEntryId: string | null;
  onToggleFavorite: (id: string) => void;
  onTogglePin: (id: string) => void;
  onToggleArchive: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onMoveToFolder: (id: string, folderId: string | undefined) => void;
  onExport: (entry: LocalJournalEntry) => void;
  onShare: (entry: LocalJournalEntry, type: 'text' | 'audio') => void;
}

type GroupType = 'daily' | 'weekly' | 'monthly' | 'yearly';

export default function TimelineView({
  entries,
  folders,
  onSelectEntry,
  selectedEntryId,
  onToggleFavorite,
  onTogglePin,
  onToggleArchive,
  onDelete,
  onDuplicate,
  onMoveToFolder,
  onExport,
  onShare
}: TimelineViewProps) {
  const [groupType, setGroupType] = useState<GroupType>('daily');
  const [activeFolderDropdownId, setActiveFolderDropdownId] = useState<string | null>(null);

  // Helper: Get human-readable date group headers
  const getGroupHeader = (dateStr: string, type: GroupType): string => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Undated Logs';

    switch (type) {
      case 'yearly':
        return d.getFullYear().toString();
      case 'monthly':
        return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
      case 'weekly':
        // Get week number of the year
        const startOfYear = new Date(d.getFullYear(), 0, 1);
        const pastDays = (d.getTime() - startOfYear.getTime()) / 86400000;
        const weekNum = Math.ceil((pastDays + startOfYear.getDay() + 1) / 7);
        return `Week ${weekNum} • ${d.getFullYear()}`;
      case 'daily':
      default:
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);

        if (d.toDateString() === today.toDateString()) {
          return 'Today';
        } else if (d.toDateString() === yesterday.toDateString()) {
          return 'Yesterday';
        }
        return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  // Group entries dynamically
  const groupEntries = () => {
    const sorted = [...entries].sort((a, b) => {
      // Keep pinned entries at the very top of all lists
      const aPinned = a.pinned ? 1 : 0;
      const bPinned = b.pinned ? 1 : 0;
      if (aPinned !== bPinned) return bPinned - aPinned;

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const groups: { [key: string]: LocalJournalEntry[] } = {};

    sorted.forEach((entry) => {
      // If pinned, group under 'Pinned Memories' to highlight, else standard date groupings
      const header = entry.pinned ? '📌 Pinned Logs' : getGroupHeader(entry.createdAt, groupType);
      if (!groups[header]) {
        groups[header] = [];
      }
      groups[header].push(entry);
    });

    return groups;
  };

  const grouped = groupEntries();
  const groupKeys = Object.keys(grouped);

  return (
    <div className="space-y-4">
      {/* Grouping Filter Bar */}
      <div className="flex items-center justify-between pb-2 border-b border-gray-500/10">
        <span className="text-xs font-mono uppercase tracking-wider text-gray-500">Timeline Stream</span>
        
        <div className="flex bg-gray-500/5 p-0.5 rounded-lg border border-gray-500/10">
          {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setGroupType(type)}
              className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-md cursor-pointer transition-all ${
                groupType === type
                  ? 'bg-cyan-500 text-white font-black'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Main timeline listing */}
      {entries.length === 0 ? (
        <div className="p-12 border border-dashed border-gray-500/20 rounded-2xl text-center space-y-1.5 bg-gray-500/2 select-none">
          <Calendar className="h-8 w-8 text-gray-600 mx-auto" />
          <p className="text-xs font-semibold text-gray-400">Timeline stream empty</p>
          <p className="text-[11px] text-gray-500 max-w-xs mx-auto">No voice snippets matching your filters. Make a new recording or adjust search criteria.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupKeys.map((header) => (
            <div key={header} className="space-y-2.5">
              {/* Group Heading */}
              <h3 className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-black pl-2 border-l-2 border-cyan-500/50">
                {header}
              </h3>

              {/* Group items cards */}
              <div className="space-y-3 pl-3 border-l border-gray-500/10">
                {grouped[header].map((entry) => {
                  const isSelected = selectedEntryId === entry.id;
                  const itemFolder = folders.find((f) => f.id === entry.folderId);
                  
                  return (
                    <div
                      key={entry.id}
                      className={`group relative p-4 rounded-xl border transition-all duration-200 ${
                        isSelected
                          ? 'bg-cyan-500/[0.04] border-cyan-500/35 shadow-md shadow-cyan-950/5'
                          : 'bg-gray-500/5 border-gray-500/10 hover:border-gray-500/20 hover:bg-gray-500/[0.07]'
                      }`}
                    >
                      {/* Entry Header Info */}
                      <div className="flex items-start justify-between gap-3 text-[10px]">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-mono text-gray-500 uppercase text-[9px]">{entry.id}</span>
                          
                          {/* Folder badge */}
                          {itemFolder && (
                            <span 
                              className="px-2 py-0.2 rounded font-mono text-[9px] font-bold"
                              style={{ 
                                backgroundColor: `${itemFolder.color}15`, 
                                color: itemFolder.color,
                                border: `1px solid ${itemFolder.color}25`
                              }}
                            >
                              📁 {itemFolder.name}
                            </span>
                          )}

                          {entry.pinned && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold flex items-center gap-0.5">
                              <Pin className="h-2.5 w-2.5" /> PINNED
                            </span>
                          )}

                          {entry.favorite && (
                            <span className="px-1.5 py-0.2 rounded bg-red-500/10 border border-red-500/20 text-red-400 font-bold flex items-center gap-0.5">
                              <Star className="h-2.5 w-2.5 fill-current" /> FAV
                            </span>
                          )}

                          {entry.archived && (
                            <span className="px-1.5 py-0.2 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold">
                              ARCHIVE
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 font-mono text-gray-500">
                          <Clock className="h-3 w-3" />
                          <span>{new Date(entry.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>

                      {/* Main Entry Title & Snippet */}
                      <div className="mt-2 space-y-1.5 cursor-pointer" onClick={() => onSelectEntry(entry)}>
                        <h4 className={`text-xs font-bold leading-normal ${isSelected ? 'text-cyan-400' : 'text-gray-200 group-hover:text-cyan-400/80 transition-colors'}`}>
                          {entry.title || 'Untitled Vocal Reflection'}
                        </h4>
                        
                        <p className="text-[11.5px] text-gray-400 leading-relaxed truncate-3-lines line-clamp-3">
                          {entry.transcript || 'Spoken journal holds no transcript yet.'}
                        </p>
                      </div>

                      {/* Info bar: duration, words, actions */}
                      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-gray-500/5 text-[10px]">
                        <div className="flex items-center gap-2 text-gray-400">
                          <span className="px-2 py-0.5 rounded bg-cyan-500/5 text-cyan-400 font-bold font-mono">
                            Mood: {entry.moodScore}/10
                          </span>
                          {entry.audioDuration > 0 && (
                            <span className="font-mono text-gray-300 bg-gray-500/10 px-1.5 py-0.5 rounded">
                              Audio: {entry.audioDuration}s
                            </span>
                          )}
                          <span className="font-sans text-gray-500">
                            {entry.wordCount || 0} words
                          </span>
                        </div>

                        {/* Inline Actions Toolbar */}
                        <div className="flex items-center gap-1.5">
                          {/* Folder Dropdown toggle */}
                          <div className="relative">
                            <button
                              onClick={() => setActiveFolderDropdownId(activeFolderDropdownId === entry.id ? null : entry.id)}
                              className="p-1 text-gray-400 hover:text-cyan-400 transition-colors rounded cursor-pointer"
                              title="Assign folder/collection"
                            >
                              <FolderOpen className="h-3.5 w-3.5" />
                            </button>
                            {activeFolderDropdownId === entry.id && (
                              <div className="absolute right-0 bottom-6 z-10 w-44 bg-[#111827] border border-gray-500/20 rounded-xl p-1.5 shadow-xl space-y-1">
                                <span className="text-[9px] font-mono text-gray-500 block px-2 uppercase py-1">Assign to:</span>
                                <button
                                  onClick={() => {
                                    onMoveToFolder(entry.id, undefined);
                                    setActiveFolderDropdownId(null);
                                  }}
                                  className="w-full text-left px-2 py-1 text-[10px] text-gray-400 hover:bg-gray-500/5 hover:text-gray-200 rounded-lg cursor-pointer"
                                >
                                  Unassigned
                                </button>
                                {folders.map((f) => (
                                  <button
                                    key={f.id}
                                    onClick={() => {
                                      onMoveToFolder(entry.id, f.id);
                                      setActiveFolderDropdownId(null);
                                    }}
                                    className="w-full text-left px-2 py-1 text-[10px] text-gray-300 hover:bg-gray-500/10 rounded-lg flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: f.color }} />
                                    <span className="truncate">{f.name}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Pin */}
                          <button
                            onClick={() => onTogglePin(entry.id)}
                            className={`p-1 transition-colors rounded cursor-pointer ${
                              entry.pinned ? 'text-amber-400 hover:text-amber-500' : 'text-gray-400 hover:text-amber-400'
                            }`}
                            title={entry.pinned ? 'Unpin' : 'Pin to top'}
                          >
                            <Pin className="h-3.5 w-3.5" />
                          </button>

                          {/* Favorite */}
                          <button
                            onClick={() => onToggleFavorite(entry.id)}
                            className={`p-1 transition-colors rounded cursor-pointer ${
                              entry.favorite ? 'text-red-400 hover:text-red-500' : 'text-gray-400 hover:text-red-400'
                            }`}
                            title="Favorite"
                          >
                            <Heart className={`h-3.5 w-3.5 ${entry.favorite ? 'fill-current' : ''}`} />
                          </button>

                          {/* Archive */}
                          <button
                            onClick={() => onToggleArchive(entry.id)}
                            className={`p-1 transition-colors rounded cursor-pointer ${
                              entry.archived ? 'text-indigo-400 hover:text-indigo-500' : 'text-gray-400 hover:text-indigo-400'
                            }`}
                            title={entry.archived ? 'Send to inbox' : 'Archive'}
                          >
                            <Archive className="h-3.5 w-3.5" />
                          </button>

                          {/* Duplicate */}
                          <button
                            onClick={() => onDuplicate(entry.id)}
                            className="p-1 text-gray-400 hover:text-gray-200 transition-colors rounded cursor-pointer"
                            title="Duplicate record"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>

                          {/* Export */}
                          <button
                            onClick={() => onExport(entry)}
                            className="p-1 text-gray-400 hover:text-cyan-400 transition-colors rounded cursor-pointer"
                            title="Export as markdown/JSON"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>

                          {/* Share Text */}
                          <button
                            onClick={() => onShare(entry, 'text')}
                            className="p-1 text-gray-400 hover:text-cyan-400 transition-colors rounded cursor-pointer"
                            title="Copy transcript link"
                          >
                            <Share2 className="h-3.5 w-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => onDelete(entry.id)}
                            className="p-1 text-gray-400 hover:text-red-400 transition-colors rounded cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
