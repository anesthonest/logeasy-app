import React, { useState } from 'react';
import { Search, SlidersHorizontal, Star, Pin, Calendar, Volume2, Save, X, Bookmark } from 'lucide-react';
import { SearchFilter, SavedSearch } from './VoiceJournalTypes';
import { logger } from '../../core/analytics/logger';

interface SearchEngineProps {
  filter: SearchFilter;
  onFilterChange: (updates: Partial<SearchFilter>) => void;
  savedSearches: SavedSearch[];
  onAddSavedSearch: (name: string) => void;
  onDeleteSavedSearch: (id: string) => void;
  availableTags: string[];
  availableCategories: string[];
}

export default function SearchEngine({
  filter,
  onFilterChange,
  savedSearches,
  onAddSavedSearch,
  onDeleteSavedSearch,
  availableTags,
  availableCategories,
}: SearchEngineProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!saveSearchName.trim()) return;
    
    onAddSavedSearch(saveSearchName.trim());
    setSaveSearchName('');
    setIsSaving(false);
    logger.info('SearchEngine', `Saved current search filter query under: "${saveSearchName}"`);
  };

  const clearQuery = () => {
    onFilterChange({ query: '' });
  };

  const toggleTag = (tag: string) => {
    const list = filter.tags.includes(tag)
      ? filter.tags.filter((t) => t !== tag)
      : [...filter.tags, tag];
    onFilterChange({ tags: list });
  };

  const toggleCategory = (cat: string) => {
    const list = filter.categories.includes(cat)
      ? filter.categories.filter((c) => c !== cat)
      : [...filter.categories, cat];
    onFilterChange({ categories: list });
  };

  return (
    <div className="p-4 rounded-2xl bg-gray-500/5 border border-gray-500/10 space-y-4">
      {/* Query Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-gray-500" />
          <input
            type="text"
            value={filter.query}
            onChange={(e) => onFilterChange({ query: e.target.value })}
            placeholder="Search by title, transcript topic, or tag..."
            className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-[#0e1320] border border-gray-500/15 outline-none text-xs text-gray-200 focus:border-cyan-500/30 transition-all font-medium"
          />
          {filter.query && (
            <button
              onClick={clearQuery}
              className="absolute right-3 top-2.5 p-0.5 rounded-full hover:bg-gray-500/10 text-gray-400 hover:text-gray-200 transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filter Expand Button */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`p-2.5 border rounded-xl transition-all cursor-pointer ${
            showFilters || filter.tags.length > 0 || filter.categories.length > 0 || filter.isPinned || filter.isFavorite
              ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
              : 'border-gray-500/15 text-gray-400 hover:bg-gray-500/5'
          }`}
          title="Toggle search filters"
        >
          <SlidersHorizontal className="h-4.5 w-4.5" />
        </button>

        {/* Save Current Search preset */}
        <button
          onClick={() => setIsSaving(!isSaving)}
          className={`p-2.5 border rounded-xl transition-all cursor-pointer ${
            isSaving
              ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400'
              : 'border-gray-500/15 text-gray-400 hover:bg-gray-500/5'
          }`}
          title="Save search parameters"
        >
          <Save className="h-4.5 w-4.5" />
        </button>
      </div>

      {/* Save Search Form Drawer */}
      {isSaving && (
        <form onSubmit={handleSaveSearchSubmit} className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl flex items-center gap-2">
          <input
            type="text"
            value={saveSearchName}
            onChange={(e) => setSaveSearchName(e.target.value)}
            placeholder="Label (e.g. 'Work Logs', 'Favorites')"
            maxLength={25}
            className="flex-1 px-2.5 py-1.5 rounded-lg bg-[#0e1320] border border-indigo-500/25 outline-none text-xs text-gray-200 focus:border-indigo-500/40"
          />
          <button
            type="submit"
            disabled={!saveSearchName.trim()}
            className="px-3 py-1.5 bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-40 text-[10px] font-bold rounded-lg cursor-pointer"
          >
            Save Preset
          </button>
        </form>
      )}

      {/* Filters expand card panel */}
      {showFilters && (
        <div className="p-4 rounded-xl bg-gray-500/5 border border-gray-500/10 space-y-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
          
          {/* Quick Boolean Filters */}
          <div className="space-y-2">
            <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">Special Markers</span>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => onFilterChange({ isFavorite: !filter.isFavorite ? true : undefined })}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border flex items-center gap-1 cursor-pointer transition-all ${
                  filter.isFavorite
                    ? 'bg-red-500/10 border-red-500/20 text-red-400'
                    : 'border-gray-500/10 text-gray-400 hover:bg-gray-500/5'
                }`}
              >
                <Star className="h-3 w-3 fill-current" /> Favorites
              </button>
              <button
                onClick={() => onFilterChange({ isPinned: !filter.isPinned ? true : undefined })}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border flex items-center gap-1 cursor-pointer transition-all ${
                  filter.isPinned
                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                    : 'border-gray-500/10 text-gray-400 hover:bg-gray-500/5'
                }`}
              >
                <Pin className="h-3 w-3" /> Pinned
              </button>
              <button
                onClick={() => onFilterChange({ isArchived: filter.isArchived === undefined ? true : undefined })}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border flex items-center gap-1 cursor-pointer transition-all ${
                  filter.isArchived
                    ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                    : 'border-gray-500/10 text-gray-400 hover:bg-gray-500/5'
                }`}
              >
                <Bookmark className="h-3 w-3" /> Archived
              </button>
            </div>
          </div>

          {/* Sort Settings */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">Sort Records By</span>
            <select
              value={filter.sortBy}
              onChange={(e) => onFilterChange({ sortBy: e.target.value as any })}
              className="w-full bg-[#0e1320] border border-gray-500/20 rounded-lg px-2.5 py-1.5 text-xs text-gray-300 outline-none cursor-pointer focus:border-cyan-500/30"
            >
              <option value="createdAt_desc" className="bg-[#121824]">Newest Spoken First</option>
              <option value="createdAt_asc" className="bg-[#121824]">Oldest Spoken First</option>
              <option value="audioDuration_desc" className="bg-[#121824]">Longest Recordings</option>
              <option value="title_asc" className="bg-[#121824]">Topic Title (A-Z)</option>
            </select>
          </div>

          {/* Duration Filters */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">Duration Limits (Secs)</span>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                value={filter.durationMin || ''}
                onChange={(e) => onFilterChange({ durationMin: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="Min"
                className="w-full px-2 py-1 bg-[#0e1320] border border-gray-500/20 rounded-lg text-xs outline-none text-gray-300"
              />
              <span className="text-gray-600 font-mono text-[10px]">to</span>
              <input
                type="number"
                value={filter.durationMax || ''}
                onChange={(e) => onFilterChange({ durationMax: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="Max"
                className="w-full px-2 py-1 bg-[#0e1320] border border-gray-500/20 rounded-lg text-xs outline-none text-gray-300"
              />
            </div>
          </div>

          {/* Tags cloud */}
          {availableTags.length > 0 && (
            <div className="space-y-1.5 md:col-span-2">
              <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">Filter by Tag Cloud</span>
              <div className="flex gap-1.5 flex-wrap">
                {availableTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-2 py-1 rounded text-[9px] uppercase font-bold border cursor-pointer transition-all ${
                      filter.tags.includes(tag)
                        ? 'bg-cyan-500/10 border-cyan-500/35 text-cyan-400 font-black'
                        : 'border-gray-500/10 text-gray-400 hover:text-gray-300'
                    }`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Categories cloud */}
          {availableCategories.length > 0 && (
            <div className="space-y-1.5 md:col-span-1">
              <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">Filter by Category</span>
              <div className="flex gap-1.5 flex-wrap">
                {availableCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => toggleCategory(cat)}
                    className={`px-2 py-1 rounded text-[9px] uppercase font-bold border cursor-pointer transition-all ${
                      filter.categories.includes(cat)
                        ? 'bg-indigo-500/10 border-indigo-500/35 text-indigo-400 font-black'
                        : 'border-gray-500/10 text-gray-400 hover:text-gray-300'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* Saved Searches List */}
      {savedSearches.length > 0 && (
        <div className="flex items-center gap-2 pt-1.5 overflow-x-auto select-none">
          <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider shrink-0">Saved Presets:</span>
          <div className="flex gap-1.5">
            {savedSearches.map((ss) => (
              <div key={ss.id} className="flex items-center bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/10 text-[9px] font-bold text-indigo-400 pl-2.5 pr-1 py-0.5 rounded-lg shrink-0">
                <button
                  onClick={() => onFilterChange(ss.filter)}
                  className="mr-1.5 cursor-pointer hover:text-indigo-200"
                >
                  {ss.name}
                </button>
                <button
                  onClick={() => onDeleteSavedSearch(ss.id)}
                  className="p-0.5 text-indigo-400/40 hover:text-red-400 cursor-pointer rounded"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
