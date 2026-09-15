import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, FastForward, Volume2, RotateCcw } from 'lucide-react';

interface AudioPlaybackEngineProps {
  audioUrl: string;
  duration: number; // in seconds
  title?: string;
}

export default function AudioPlaybackEngine({ audioUrl, duration, title }: AudioPlaybackEngineProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [volume, setVolume] = useState(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Reset play state on source change
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [audioUrl]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleSpeedChange = () => {
    const speeds = [0.5, 1, 1.25, 1.5, 2];
    const currentIndex = speeds.indexOf(playbackSpeed);
    const nextIndex = (currentIndex + 1) % speeds.length;
    setPlaybackSpeed(speeds[nextIndex]);
  };

  const handleRestart = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      if (!isPlaying) {
        audioRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
    }
  };

  const formatTime = (timeSecs: number) => {
    const mins = Math.floor(timeSecs / 60);
    const secs = Math.floor(timeSecs % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/10 space-y-3">
      {/* Invisible HTML Audio Element */}
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleAudioEnded}
      />

      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider truncate max-w-[200px]">
          {title || 'Original Voice Capture'}
        </span>
        <span className="text-[10px] font-mono text-gray-400">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>

      {/* Progress slider bar */}
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={0}
          max={duration || 1}
          step={0.1}
          value={currentTime}
          onChange={handleSeek}
          className="flex-1 accent-cyan-400 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
        />
      </div>

      {/* Control bar */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          {/* Restart */}
          <button
            onClick={handleRestart}
            title="Restart"
            className="p-1.5 rounded-lg hover:bg-gray-500/10 text-gray-400 hover:text-gray-200 transition-colors cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" />
          </button>

          {/* Play/Pause */}
          <button
            onClick={togglePlay}
            className="p-2.5 rounded-full bg-cyan-500 hover:bg-cyan-600 text-white shadow-md shadow-cyan-950/20 transition-all cursor-pointer"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
          </button>

          {/* Playback speed multiplier */}
          <button
            onClick={handleSpeedChange}
            className="px-2 py-1.5 rounded-lg bg-gray-500/10 hover:bg-gray-500/20 text-gray-300 font-mono text-[10px] border border-gray-500/15 transition-all cursor-pointer"
            title="Adjust speed"
          >
            {playbackSpeed}x
          </button>
        </div>

        {/* Volume controls */}
        <div className="flex items-center gap-1.5 text-gray-400">
          <Volume2 className="h-3.5 w-3.5" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(e) => {
              const v = Number(e.target.value);
              setVolume(v);
              if (audioRef.current) {
                audioRef.current.volume = v;
              }
            }}
            className="w-16 h-1 accent-cyan-500 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}
