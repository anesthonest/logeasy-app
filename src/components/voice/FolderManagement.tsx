import React, { useState } from 'react';
import { FolderPlus, Folder, Trash2, Plus, ArrowRight, LayoutGrid } from 'lucide-react';
import { Folder as FolderType } from './VoiceJournalTypes';
import { logger } from '../../core/analytics/logger';

interface FolderManagementProps {
  folders: FolderType[];
  onCreateFolder: (name: string, color?: string) => void;
  onDeleteFolder: (id: string) => void;
  selectedFolderId: string | null;
  onSelectFolder: (id: string | null) => void;
  entryCounts: Record<string, number>;
}

export default function FolderManagement({
  folders,
  onCreateFolder,
  onDeleteFolder,
  selectedFolderId,
  onSelectFolder,
  entryCounts
}: FolderManagementProps) {
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('#06b6d4'); // Default cyan

  const COLORS = ['#06b6d4', '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#a855f7'];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    
    onCreateFolder(newFolderName.trim(), newFolderColor);
    setNewFolderName('');
    logger.info('FolderManagement', `Created new folder/collection named: "${newFolderName}"`);
  };

  return (
    <div className="space-y-5 p-5 rounded-2xl bg-gray-500/5 border border-gray-500/10">
      <div className="flex justify-between items-center pb-2 border-b border-gray-500/10">
        <div className="flex items-center gap-2">
          <Folder className="h-4 w-4 text-cyan-400" />
          <h3 className="text-xs font-mono uppercase tracking-widest text-gray-400">Collections & Folders</h3>
        </div>
      </div>

      {/* Folders List Selector */}
      <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
        {/* All Entries (Default) */}
        <button
          onClick={() => onSelectFolder(null)}
          className={`w-full px-3 py-2.5 rounded-xl text-xs flex items-center justify-between transition-all cursor-pointer border ${
            selectedFolderId === null
              ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 font-bold'
              : 'border-transparent text-gray-400 hover:bg-gray-500/5 hover:text-gray-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <LayoutGrid className="h-4 w-4" />
            <span>All Voice Journals</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-gray-500/10 text-gray-400">
            {entryCounts['all'] || 0}
          </span>
        </button>

        {/* Dynamic User Folders */}
        {folders.length === 0 ? (
          <div className="text-center py-4 text-[11px] text-gray-500">
            No folders created yet. Organize your voice logs by creating one below.
          </div>
        ) : (
          folders.map((folder) => {
            const count = entryCounts[folder.id] || 0;
            return (
              <div
                key={folder.id}
                className={`group flex items-center justify-between rounded-xl border transition-all ${
                  selectedFolderId === folder.id
                    ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 font-bold'
                    : 'border-transparent text-gray-400 hover:bg-gray-500/5 hover:text-gray-200'
                }`}
              >
                <button
                  onClick={() => onSelectFolder(folder.id)}
                  className="flex-1 px-3 py-2.5 text-xs flex items-center gap-2.5 cursor-pointer text-left truncate"
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: folder.color || '#06b6d4' }}
                  />
                  <span className="truncate">{folder.name}</span>
                </button>

                <div className="flex items-center pr-2 gap-1">
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-gray-500/10 text-gray-400">
                    {count}
                  </span>
                  <button
                    onClick={() => onDeleteFolder(folder.id)}
                    className="p-1 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    title="Delete collection"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Folder Inline Form */}
      <form onSubmit={handleCreate} className="pt-3 border-t border-gray-500/10 space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="New collection name..."
            maxLength={22}
            className="flex-1 px-2.5 py-1.5 rounded-lg bg-[#0e1320] border border-gray-500/15 outline-none text-xs text-gray-200 focus:border-cyan-500/30"
          />
          <button
            type="submit"
            disabled={!newFolderName.trim()}
            className="p-1.5 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-45 text-white rounded-lg cursor-pointer transition-all shrink-0"
            title="Create folder"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* Color Palette Choice */}
        <div className="flex items-center gap-1.5 pt-1 justify-between">
          <span className="text-[10px] text-gray-500 font-mono uppercase">Color Accent</span>
          <div className="flex gap-1">
            {COLORS.map((col) => (
              <button
                key={col}
                type="button"
                onClick={() => setNewFolderColor(col)}
                className={`h-4 w-4 rounded-full border transition-all cursor-pointer ${
                  newFolderColor === col
                    ? 'border-white scale-110 shadow-sm'
                    : 'border-transparent opacity-65 hover:opacity-100'
                }`}
                style={{ backgroundColor: col }}
              />
            ))}
          </div>
        </div>
      </form>
    </div>
  );
}
