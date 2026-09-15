import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, Languages, RefreshCw, Check, Sparkles, AlertTriangle, 
  Tag as TagIcon, LayoutGrid, Heart, Pin, Archive, HelpCircle 
} from 'lucide-react';
import { LocalJournalEntry } from '../../core/database/local_db';
import { logger } from '../../core/analytics/logger';
import AudioPlaybackEngine from './AudioPlaybackEngine';

interface TranscriptEditorProps {
  entry: LocalJournalEntry;
  onSave: (updates: Partial<LocalJournalEntry>) => void;
  onRetryTranscription: (id: string, language: string) => Promise<string>;
}

const LANGUAGES_SUPPORTED = [
  { code: 'en-US', name: 'English (US)' },
  { code: 'es-ES', name: 'Spanish (Spain)' },
  { code: 'fr-FR', name: 'French (France)' },
  { code: 'de-DE', name: 'German (Germany)' },
  { code: 'ja-JP', name: 'Japanese (Japan)' },
  { code: 'zh-CN', name: 'Chinese (Mandarin)' },
  { code: 'pt-BR', name: 'Portuguese (Brazil)' },
  { code: 'hi-IN', name: 'Hindi (India)' }
];

export default function TranscriptEditor({ entry, onSave, onRetryTranscription }: TranscriptEditorProps) {
  const [title, setTitle] = useState(entry.title || '');
  const [transcript, setTranscript] = useState(entry.transcript || '');
  const [language, setLanguage] = useState(entry.language || 'en-US');
  const [tagsInput, setTagsInput] = useState((entry.tags || []).join(', '));
  const [categoriesInput, setCategoriesInput] = useState((entry.categories || []).join(', '));
  
  // Status states
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'dirty'>('saved');
  const [accentTolerance, setAccentTolerance] = useState(true);

  const autoSaveTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setTitle(entry.title || '');
    setTranscript(entry.transcript || '');
    setLanguage(entry.language || 'en-US');
    setTagsInput((entry.tags || []).join(', '));
    setCategoriesInput((entry.categories || []).join(', '));
    setSaveStatus('saved');
  }, [entry.id]);

  // Handle auto-save trigger with simple 1.2s debouncing
  const triggerAutoSave = (updatedFields: Partial<LocalJournalEntry>) => {
    setSaveStatus('saving');
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = window.setTimeout(() => {
      onSave({
        ...updatedFields,
        updatedAt: new Date().toISOString(),
        versionNumber: (entry.versionNumber || 1) + 1,
      });
      setSaveStatus('saved');
      logger.debug('TranscriptEditor', 'Auto-saved journal edits successfully');
    }, 1200);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    setSaveStatus('dirty');
    triggerAutoSave({ title: val });
  };

  const handleTranscriptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setTranscript(val);
    setSaveStatus('dirty');
    
    const words = val.trim() ? val.trim().split(/\s+/).length : 0;
    triggerAutoSave({ transcript: val, wordCount: words });
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setLanguage(val);
    onSave({ language: val });
    logger.info('TranscriptEditor', `Accent-tolerant target dialect configured: ${val}`);
  };

  const handleTagsBlur = () => {
    const list = tagsInput.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
    onSave({ tags: list });
  };

  const handleCategoriesBlur = () => {
    const list = categoriesInput.split(',').map((c) => c.trim()).filter(Boolean);
    onSave({ categories: list });
  };

  // Re-transcribe with selected language and simulated API latency
  const handleRunTranscription = async () => {
    setIsTranscribing(true);
    logger.info('TranscriptEditor', `Manually executing Speech-To-Text pipeline override using language: ${language}...`);
    
    try {
      const newTranscript = await onRetryTranscription(entry.id, language);
      setTranscript(newTranscript);
      setSaveStatus('saved');
      logger.info('TranscriptEditor', 'Speech-To-Text pipeline finished transcribing successfully.');
    } catch (err) {
      logger.error('TranscriptEditor', 'Speech-To-Text processing pipeline failed.', err);
    } finally {
      setIsTranscribing(false);
    }
  };

  const wordCount = transcript.trim() ? transcript.trim().split(/\s+/).length : 0;

  return (
    <div className="space-y-5 p-5 rounded-2xl bg-gray-500/5 border border-gray-500/10">
      
      {/* Save indicator & action headers */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-500/10">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-cyan-400" />
          <h3 className="text-sm font-bold text-gray-200">Spoken Journal Metadata Editor</h3>
        </div>
        <div className="flex items-center gap-2">
          {saveStatus === 'saved' && (
            <span className="text-[10px] text-emerald-400 flex items-center gap-1 bg-emerald-500/5 px-2.5 py-1 border border-emerald-500/10 rounded-lg">
              <Check className="h-3 w-3" /> Auto-saved
            </span>
          )}
          {saveStatus === 'saving' && (
            <span className="text-[10px] text-cyan-400 flex items-center gap-1 bg-cyan-500/5 px-2.5 py-1 border border-cyan-500/10 rounded-lg animate-pulse">
              <RefreshCw className="h-3 w-3 animate-spin" /> Saving...
            </span>
          )}
          {saveStatus === 'dirty' && (
            <span className="text-[10px] text-amber-400 flex items-center gap-1 bg-amber-500/5 px-2.5 py-1 border border-amber-500/10 rounded-lg">
              <AlertTriangle className="h-3 w-3" /> Unsaved changes
            </span>
          )}
        </div>
      </div>

      {/* Embedded audio playback player if available */}
      {entry.audioUrl && (
        <AudioPlaybackEngine
          audioUrl={entry.audioUrl}
          duration={entry.audioDuration}
          title={title || 'Voice Capture Record'}
        />
      )}

      {/* Core Editor Inputs */}
      <div className="space-y-4">
        {/* Title Input */}
        <div className="space-y-1">
          <label className="text-[11px] font-mono text-gray-400 uppercase tracking-wider block">Title / Topic Name</label>
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            placeholder="E.g., Morning thoughts on code architecture"
            className="w-full px-3 py-2.5 rounded-xl bg-gray-500/5 border border-gray-500/15 outline-none text-xs text-gray-100 font-medium focus:border-cyan-500/40 focus:bg-cyan-500/5 transition-all"
          />
        </div>

        {/* Speech-to-Text Language Config Panel */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-500/5 p-3.5 rounded-xl border border-gray-500/10">
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-gray-400 uppercase tracking-widest flex items-center gap-1">
              <Languages className="h-3 w-3" /> Dialect Language
            </label>
            <select
              value={language}
              onChange={handleLanguageChange}
              className="w-full bg-[#121824] border border-gray-500/20 rounded-lg px-2.5 py-1.5 text-xs text-gray-300 outline-none cursor-pointer focus:border-cyan-500/30"
            >
              {LANGUAGES_SUPPORTED.map((lang) => (
                <option key={lang.code} value={lang.code} className="bg-[#121824] text-xs">
                  {lang.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5 flex flex-col justify-end">
            <button
              onClick={handleRunTranscription}
              disabled={isTranscribing}
              className="w-full py-1.5 px-3 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-cyan-950/20 transition-all"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isTranscribing ? 'animate-spin' : ''}`} />
              <span>{isTranscribing ? 'Re-transcribing...' : 'Retry STT pipeline'}</span>
            </button>
          </div>
        </div>

        {/* Transcript Textarea Input */}
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <label className="text-[11px] font-mono text-gray-400 uppercase tracking-wider block">Decrypted Spoken Transcript</label>
            <span className="text-[10px] font-mono text-gray-400">
              {wordCount} words • {transcript.length} chars
            </span>
          </div>
          <textarea
            value={transcript}
            onChange={handleTranscriptChange}
            placeholder="Voice recording transcription will appear here. Feel free to type edits..."
            rows={6}
            className="w-full px-3.5 py-3 rounded-xl bg-gray-500/5 border border-gray-500/15 outline-none text-xs text-gray-200 focus:border-cyan-500/40 focus:bg-cyan-500/5 transition-all font-sans leading-relaxed resize-y"
          />
        </div>

        {/* Metadata tagging and Categories */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[11px] font-mono text-gray-400 uppercase tracking-wider flex items-center gap-1">
              <TagIcon className="h-3 w-3 text-cyan-400" /> Tags (comma-separated)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              onBlur={handleTagsBlur}
              placeholder="growth, cognitive, reflections"
              className="w-full px-3 py-2 rounded-xl bg-gray-500/5 border border-gray-500/15 outline-none text-xs text-gray-300 focus:border-cyan-500/30"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-mono text-gray-400 uppercase tracking-wider flex items-center gap-1">
              <LayoutGrid className="h-3 w-3 text-cyan-400" /> Categories
            </label>
            <input
              type="text"
              value={categoriesInput}
              onChange={(e) => setCategoriesInput(e.target.value)}
              onBlur={handleCategoriesBlur}
              placeholder="Mental Wellness, Work Log"
              className="w-full px-3 py-2 rounded-xl bg-gray-500/5 border border-gray-500/15 outline-none text-xs text-gray-300 focus:border-cyan-500/30"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
