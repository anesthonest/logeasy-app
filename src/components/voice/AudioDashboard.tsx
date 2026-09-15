import React, { useState } from 'react';
import { HardDrive, RefreshCw, Sparkles, Check, Trash2, ArrowUpRight } from 'lucide-react';
import { logger } from '../../core/analytics/logger';

interface AudioDashboardProps {
  totalEntriesCount: number;
  totalAudioDuration: number; // in seconds
  totalStorageBytes: number; // in bytes
  onReclaimSpace: () => Promise<number>; // resolves freed bytes
  onDeleteAllAudio: () => Promise<void>;
}

export default function AudioDashboard({
  totalEntriesCount,
  totalAudioDuration,
  totalStorageBytes,
  onReclaimSpace,
  onDeleteAllAudio,
}: AudioDashboardProps) {
  const [compressing, setCompressing] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [codec, setCodec] = useState<'opus' | 'webm' | 'flac'>('opus');
  const [compressionResult, setCompressionResult] = useState<string | null>(null);

  // Constants
  const MAX_STORAGE_CAP_BYTES = 50 * 1024 * 1024; // 50MB safe web local cap quota

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0.0 KB';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m ${secs}s`;
  };

  const handleCompress = async () => {
    setCompressing(true);
    setCompressionResult(null);
    logger.info('AudioDashboard', `Initializing safe ${codec.toUpperCase()} compressor transcode engine on local audio buffers...`);
    
    try {
      const freedBytes = await onReclaimSpace();
      setCompressionResult(`Successfully trans-encoded voice files. Freed ${formatSize(freedBytes)}!`);
      logger.info('AudioDashboard', `Transcoding complete. Freed ${freedBytes} bytes on indexDB database cache partition.`);
    } catch (err) {
      logger.error('AudioDashboard', 'Failed compressing voice records.', err);
    } finally {
      setCompressing(false);
    }
  };

  const handleClearAll = async () => {
    if (window.confirm('WARNING: This will permanently purge all local audio binary chunks, leaving only text transcripts. This action is irreversible. Proceed?')) {
      setClearing(true);
      try {
        await onDeleteAllAudio();
        logger.info('AudioDashboard', 'Purged all local offline audio storage partitions.');
      } finally {
        setClearing(false);
      }
    }
  };

  const percentageUsed = Math.min(100, (totalStorageBytes / MAX_STORAGE_CAP_BYTES) * 100);

  return (
    <div className="p-5 rounded-2xl bg-gray-500/5 border border-gray-500/10 space-y-5">
      <div className="flex items-center justify-between pb-2 border-b border-gray-500/10">
        <div className="flex items-center gap-2">
          <HardDrive className="h-4 w-4 text-cyan-400" />
          <h3 className="text-xs font-mono uppercase tracking-widest text-gray-400 font-bold">Audio Storage Dashboard</h3>
        </div>
      </div>

      {/* Bento Stats Display */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-[#0e1320] rounded-xl border border-gray-500/10">
          <span className="text-[10px] font-mono text-gray-500 uppercase">Space Occupied</span>
          <div className="text-base font-black text-cyan-400 mt-0.5">
            {formatSize(totalStorageBytes)}
          </div>
          <span className="text-[9px] text-gray-400 block mt-0.5">
            of 50.0 MB web quota
          </span>
        </div>

        <div className="p-3 bg-[#0e1320] rounded-xl border border-gray-500/10">
          <span className="text-[10px] font-mono text-gray-500 uppercase">Audio Duration</span>
          <div className="text-base font-black text-gray-200 mt-0.5">
            {formatDuration(totalAudioDuration)}
          </div>
          <span className="text-[9px] text-gray-400 block mt-0.5">
            across {totalEntriesCount} files
          </span>
        </div>
      </div>

      {/* Storage cap progress bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px] font-mono text-gray-400">
          <span>Local Quota Allocation</span>
          <span>{percentageUsed.toFixed(1)}% Used</span>
        </div>
        <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-cyan-400 rounded-full transition-all duration-500"
            style={{ width: `${percentageUsed}%` }}
          />
        </div>
      </div>

      {/* Compression presets & actions */}
      <div className="pt-3 border-t border-gray-500/10 space-y-4">
        <div className="space-y-1.5">
          <label className="text-[10px] font-mono text-gray-400 uppercase block">Re-Encoding Codec</label>
          <div className="grid grid-cols-3 gap-1 bg-gray-500/5 p-1 rounded-xl border border-gray-500/10">
            {(['opus', 'webm', 'flac'] as const).map((c) => (
              <button
                key={c}
                onClick={() => setCodec(c)}
                className={`py-1 text-[9px] uppercase font-bold rounded-lg cursor-pointer transition-all ${
                  codec === c
                    ? 'bg-cyan-500 text-white font-black'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {c === 'opus' ? 'Opus (12k)' : c === 'webm' ? 'WebM (64k)' : 'FLAC'}
              </button>
            ))}
          </div>
          <p className="text-[9px] text-gray-500 leading-relaxed leading-normal">
            {codec === 'opus' && 'Opus ultra-compression optimizes speech recordings. Reclaims up to 85% storage size while preserving crisp vocal clarity.'}
            {codec === 'webm' && 'WebM audio preserves standard web streaming capability. Medium size reclamation.'}
            {codec === 'flac' && 'FLAC lossless encoding secures absolute raw wave data. Keeps file sizes heavy.'}
          </p>
        </div>

        {compressionResult && (
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] rounded-lg font-mono flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 shrink-0" />
            <span>{compressionResult}</span>
          </div>
        )}

        <div className="flex gap-2">
          {/* Compress Space button */}
          <button
            onClick={handleCompress}
            disabled={compressing || totalStorageBytes === 0}
            className="flex-1 py-1.5 px-3 bg-cyan-500/10 hover:bg-cyan-500/20 disabled:opacity-40 border border-cyan-500/20 hover:border-cyan-500/40 text-cyan-400 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${compressing ? 'animate-spin' : ''}`} />
            <span>{compressing ? 'Compressing...' : 'Optimize Storage'}</span>
          </button>

          {/* Wipe audio binary cache button */}
          <button
            onClick={handleClearAll}
            disabled={clearing || totalStorageBytes === 0}
            className="py-1.5 px-3 bg-red-500/10 hover:bg-red-500/20 disabled:opacity-40 border border-red-500/20 text-red-400 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
            title="Purge raw audio file cache"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Purge Audio</span>
          </button>
        </div>
      </div>
    </div>
  );
}
