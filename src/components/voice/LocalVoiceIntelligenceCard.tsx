import React, { useState, useEffect } from 'react';
import { 
  Cpu, HardDrive, Download, Trash2, CheckCircle2, AlertCircle, 
  RefreshCw, ShieldCheck, Zap, Layers, Sparkles, Sliders
} from 'lucide-react';
import { localModelManager, WhisperModelMetadata } from '../../core/audio/local_model_manager';
import { localWhisperWasmEngine } from '../../core/audio/local_whisper_engine';
import { unifiedTranscriptionRouter, TranscriptionRoutingPolicy } from '../../core/audio/transcription_router';
import { deviceCapabilityDetector, DeviceCapabilities } from '../../core/audio/device_capability_detector';
import { notificationManager } from '../../core/notifications/notification_manager';

export default function LocalVoiceIntelligenceCard() {
  const [models, setModels] = useState<WhisperModelMetadata[]>(localModelManager.getAllModels());
  const [activePolicy, setActivePolicy] = useState<TranscriptionRoutingPolicy>(unifiedTranscriptionRouter.getPolicy());
  const [capabilities, setCapabilities] = useState<DeviceCapabilities | null>(null);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [isMounting, setIsMounting] = useState<string | null>(null);
  const [loadedModelId, setLoadedModelId] = useState<string | null>(localWhisperWasmEngine.getLoadedModelId());

  useEffect(() => {
    deviceCapabilityDetector.detect().then(setCapabilities);

    const unsubModels = localModelManager.subscribe((updated) => {
      setModels([...updated]);
    });

    return () => {
      unsubModels();
    };
  }, []);

  const handlePolicyChange = (policy: TranscriptionRoutingPolicy) => {
    unifiedTranscriptionRouter.setPolicy(policy);
    setActivePolicy(policy);
    notificationManager.addNotification({
      title: 'Voice Routing Policy Updated',
      body: `Routing strategy set to: ${policy.replace('_', ' ')}`,
      type: 'system',
    });
  };

  const handleDownload = async (modelId: string) => {
    setIsDownloading(modelId);
    try {
      await localModelManager.downloadModel(modelId);
      notificationManager.addNotification({
        title: 'Offline Model Ready',
        body: 'Local Whisper neural model is downloaded and verified in offline storage.',
        type: 'achievement',
      });
    } catch (err: any) {
      notificationManager.addNotification({
        title: 'Model Download Failed',
        body: err.message || 'Could not download model.',
        type: 'conflict',
      });
    } finally {
      setIsDownloading(null);
    }
  };

  const handleDelete = async (modelId: string) => {
    if (loadedModelId === modelId) {
      localWhisperWasmEngine.unloadModel();
      setLoadedModelId(null);
    }
    await localModelManager.deleteModel(modelId);
    notificationManager.addNotification({
      title: 'Model Evicted',
      body: 'Offline model weights removed from browser storage.',
      type: 'system',
    });
  };

  const handleMountModel = async (modelId: string) => {
    setIsMounting(modelId);
    try {
      const success = await localWhisperWasmEngine.loadModel(modelId);
      if (success) {
        setLoadedModelId(modelId);
        notificationManager.addNotification({
          title: 'Model Mounted to WebAssembly Heap',
          body: 'Local inference engine is active and ready for offline transcription.',
          type: 'system',
        });
      }
    } finally {
      setIsMounting(null);
    }
  };

  const handleUnloadModel = () => {
    localWhisperWasmEngine.unloadModel();
    setLoadedModelId(null);
    notificationManager.addNotification({
      title: 'Model Unloaded',
      body: 'WebAssembly memory heap released.',
      type: 'system',
    });
  };

  return (
    <div className="p-5 rounded-2xl bg-[#0e131f] border border-cyan-500/20 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-500/10">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Cpu className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-100 flex items-center gap-2">
              Local Voice AI & Whisper Engine
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                100% Offline
              </span>
            </h3>
            <p className="text-[11px] text-gray-400">
              Run neural transcription entirely inside your browser via WebAssembly. Zero audio ever touches a server.
            </p>
          </div>
        </div>
      </div>

      {/* Device Capability Matrix */}
      {capabilities && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-gray-500/5 border border-gray-500/10 text-[11px]">
          <div>
            <span className="text-gray-400 block font-mono text-[9px] uppercase tracking-wider">WebAssembly</span>
            <span className="font-semibold text-emerald-400 flex items-center gap-1 mt-0.5">
              <CheckCircle2 className="h-3 w-3" /> {capabilities.webAssemblySupported ? 'Supported' : 'Unavailable'}
            </span>
          </div>
          <div>
            <span className="text-gray-400 block font-mono text-[9px] uppercase tracking-wider">SIMD Acceleration</span>
            <span className="font-semibold text-gray-200 mt-0.5 block">
              {capabilities.simdSupported ? 'Hardware SIMD' : 'Standard WASM'}
            </span>
          </div>
          <div>
            <span className="text-gray-400 block font-mono text-[9px] uppercase tracking-wider">Free Storage</span>
            <span className="font-semibold text-gray-200 mt-0.5 block">
              {capabilities.availableStorageMb > 0 ? `${capabilities.availableStorageMb} MB Available` : 'Unmetered'}
            </span>
          </div>
          <div>
            <span className="text-gray-400 block font-mono text-[9px] uppercase tracking-wider">Recommended Path</span>
            <span className="font-semibold text-cyan-400 mt-0.5 block">
              {capabilities.recommendedPath === 'LOCAL_WHISPER_WASM' ? 'Local Whisper' : 'Browser Native'}
            </span>
          </div>
        </div>
      )}

      {/* Orchestration Policy Selector */}
      <div className="space-y-2">
        <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
          <Sliders className="h-3 w-3 text-cyan-400" /> Active Transcription Routing Strategy
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {(['AUTOMATIC', 'LOCAL_WHISPER', 'DEVICE_SPEECH', 'REMOTE_APPROVED', 'DEFERRED_ONLY'] as TranscriptionRoutingPolicy[]).map((pol) => (
            <button
              key={pol}
              onClick={() => handlePolicyChange(pol)}
              className={`py-2 px-2.5 rounded-xl text-[10px] font-medium border text-center transition-all cursor-pointer ${
                activePolicy === pol
                  ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 font-bold shadow-sm shadow-cyan-950/20'
                  : 'bg-gray-500/5 border-gray-500/10 text-gray-400 hover:text-gray-200 hover:border-gray-500/20'
              }`}
            >
              {pol.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Local Neural Model Catalog */}
      <div className="space-y-3">
        <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">
          Local Model Catalog & Offline Cache
        </label>
        <div className="space-y-2.5">
          {models.map((model) => {
            const isReady = model.status === 'ready';
            const isDownloadingThis = isDownloading === model.id;
            const isMounted = loadedModelId === model.id;

            return (
              <div
                key={model.id}
                className="p-3.5 rounded-xl bg-gray-500/5 border border-gray-500/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-200">{model.name}</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-gray-500/20 text-gray-300">
                      {model.sizeDisplay}
                    </span>
                    {isMounted && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        Active Heap
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-400">{model.description}</p>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {!isReady && (
                    <button
                      onClick={() => handleDownload(model.id)}
                      disabled={!!isDownloading}
                      className="py-1.5 px-3 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-40 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer transition-all"
                    >
                      {isDownloadingThis ? (
                        <>
                          <RefreshCw className="h-3 w-3 animate-spin" />
                          <span>{model.downloadProgress}%</span>
                        </>
                      ) : (
                        <>
                          <Download className="h-3 w-3" />
                          <span>Download</span>
                        </>
                      )}
                    </button>
                  )}

                  {isReady && !isMounted && (
                    <button
                      onClick={() => handleMountModel(model.id)}
                      disabled={!!isMounting}
                      className="py-1.5 px-3 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer transition-all"
                    >
                      <Zap className="h-3 w-3" />
                      <span>{isMounting === model.id ? 'Mounting...' : 'Mount Model'}</span>
                    </button>
                  )}

                  {isReady && isMounted && (
                    <button
                      onClick={handleUnloadModel}
                      className="py-1.5 px-3 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer transition-all"
                    >
                      <span>Unload Heap</span>
                    </button>
                  )}

                  {isReady && (
                    <button
                      onClick={() => handleDelete(model.id)}
                      className="p-1.5 text-gray-500 hover:text-red-400 rounded-lg hover:bg-red-500/10 cursor-pointer transition-all"
                      title="Delete offline model weights"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
