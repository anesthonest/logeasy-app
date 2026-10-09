/**
 * LogEasy WebAssembly & Browser Device Compatibility Matrix
 * Performs non-destructive hardware, storage, and API capability detection
 * before allowing heavy client-side operations (like Whisper WASM or local model inference).
 */

import { logger } from '../analytics/logger';

export interface DeviceCapabilities {
  webAssemblySupported: boolean;
  sharedArrayBufferSupported: boolean;
  simdSupported: boolean;
  estimatedStorageQuotaMb: number;
  estimatedStorageUsageMb: number;
  availableStorageMb: number;
  deviceMemoryGb?: number;
  hardwareConcurrency: number;
  isMobileDevice: boolean;
  browserEnvironment: 'chrome' | 'firefox' | 'safari' | 'edge' | 'unknown';
  isStorageSufficientForModel: (modelSizeBytes: number) => boolean;
  canSafelyRunWasmInference: boolean;
  recommendedPath: 'BROWSER_SPEECH' | 'LOCAL_WHISPER_WASM' | 'DEFERRED';
}

export class DeviceCapabilityDetector {
  private static instance: DeviceCapabilityDetector;

  private cachedCapabilities: DeviceCapabilities | null = null;

  private constructor() {}

  public static getInstance(): DeviceCapabilityDetector {
    if (!DeviceCapabilityDetector.instance) {
      DeviceCapabilityDetector.instance = new DeviceCapabilityDetector();
    }
    return DeviceCapabilityDetector.instance;
  }

  /**
   * Evaluates browser support for WebAssembly SIMD operations safely
   */
  public async checkSimdSupport(): Promise<boolean> {
    try {
      if (typeof WebAssembly !== 'object' || typeof WebAssembly.validate !== 'function') {
        return false;
      }
      // Minimal WebAssembly module containing a SIMD v128.const instruction
      const simdBytes = new Uint8Array([
        0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,
        0x01, 0x05, 0x01, 0x60, 0x00, 0x01, 0x7b,
        0x03, 0x02, 0x01, 0x00,
        0x0a, 0x15, 0x01, 0x13, 0x00,
        0xfd, 0x0c, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x0b
      ]);
      return WebAssembly.validate(simdBytes);
    } catch {
      return false;
    }
  }

  /**
   * Inspects current device environment and returns capability breakdown
   */
  public async detect(): Promise<DeviceCapabilities> {
    if (this.cachedCapabilities) {
      return this.cachedCapabilities;
    }

    const isBrowser = typeof window !== 'undefined';
    const hasWasm = isBrowser && typeof WebAssembly === 'object';
    const hasSAB = isBrowser && typeof SharedArrayBuffer !== 'undefined';
    const simdSupported = await this.checkSimdSupport();

    let quotaMb = 0;
    let usageMb = 0;
    let availableMb = 1024; // Default baseline 1GB for environments without strict quota metrics

    if (isBrowser && navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        if (estimate && estimate.quota) {
          quotaMb = Math.round((estimate.quota || 0) / (1024 * 1024));
          usageMb = Math.round((estimate.usage || 0) / (1024 * 1024));
          availableMb = Math.max(0, quotaMb - usageMb);
        }
      } catch (e) {
        logger.warn('DeviceCapabilityDetector', 'Failed querying storage estimate', e);
      }
    }

    const deviceMemory = isBrowser && (navigator as any).deviceMemory ? (navigator as any).deviceMemory : undefined;
    const hardwareConcurrency = isBrowser && navigator.hardwareConcurrency ? navigator.hardwareConcurrency : 4;
    
    // Detect mobile touch
    const ua = isBrowser && navigator.userAgent ? navigator.userAgent.toLowerCase() : '';
    const isMobile = /android|iphone|ipad|ipod|mobile/i.test(ua);

    // Browser family
    let browser: 'chrome' | 'firefox' | 'safari' | 'edge' | 'unknown' = 'unknown';
    if (ua.includes('edg/')) browser = 'edge';
    else if (ua.includes('chrome')) browser = 'chrome';
    else if (ua.includes('firefox')) browser = 'firefox';
    else if (ua.includes('safari')) browser = 'safari';

    const canSafelyRun = hasWasm && (deviceMemory ? deviceMemory >= 4 : true) && availableMb >= 150;
    const recommendedPath = canSafelyRun && !isMobile ? 'LOCAL_WHISPER_WASM' : 'BROWSER_SPEECH';

    const capabilities: DeviceCapabilities = {
      webAssemblySupported: hasWasm,
      sharedArrayBufferSupported: hasSAB,
      simdSupported,
      estimatedStorageQuotaMb: quotaMb,
      estimatedStorageUsageMb: usageMb,
      availableStorageMb: availableMb,
      deviceMemoryGb: deviceMemory,
      hardwareConcurrency,
      isMobileDevice: isMobile,
      browserEnvironment: browser,
      isStorageSufficientForModel: (modelSizeBytes: number) => {
        const neededMb = Math.ceil(modelSizeBytes / (1024 * 1024)) + 50; // 50MB headroom
        return availableMb >= neededMb;
      },
      canSafelyRunWasmInference: canSafelyRun,
      recommendedPath
    };

    this.cachedCapabilities = capabilities;
    logger.info('DeviceCapabilityDetector', `Detected capabilities: WASM=${hasWasm}, StorageAvailable=${availableMb}MB, Concurrency=${hardwareConcurrency}, Rec=${recommendedPath}`);
    return capabilities;
  }
}

export const deviceCapabilityDetector = DeviceCapabilityDetector.getInstance();
