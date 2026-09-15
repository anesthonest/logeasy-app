import { logger } from '../analytics/logger';

// ============================================================================
// MODULAR PLUGIN DEFINITIONS
// ============================================================================

export type PluginLifecycleState = 'unloaded' | 'loaded' | 'enabled' | 'disabled' | 'error';

export interface PluginMeta {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  requiredAppVersion: string;
  permissions: string[];
  dependencies: string[];
}

export interface PluginInstance {
  meta: PluginMeta;
  state: PluginLifecycleState;
  config: Record<string, any>;
  onLoad: () => void;
  onEnable: () => void;
  onDisable: () => void;
  onUnload: () => void;
}

// ============================================================================
// CORE PLUGIN ENGINE
// ============================================================================

class PluginManager {
  private static instance: PluginManager;
  
  private plugins: Record<string, PluginInstance> = {};
  private currentAppVersion = '1.2.0';

  private constructor() {
    this.registerStandardPlugins();
  }

  public static getInstance(): PluginManager {
    if (!PluginManager.instance) {
      PluginManager.instance = new PluginManager();
    }
    return PluginManager.instance;
  }

  private registerStandardPlugins() {
    // 1. Export Journals Plugin
    this.register({
      meta: {
        id: 'export_journals_plugin',
        name: 'Omni Export Utility (PDF & Markdown)',
        version: '1.0.0',
        description: 'Enables advanced bulk document printing and conversion to structured Markdown archives.',
        author: 'LogEasy Core Team',
        requiredAppVersion: '>=1.1.0',
        permissions: ['local_storage_read', 'file_save'],
        dependencies: []
      },
      state: 'unloaded',
      config: { includeMoodMetrics: true, markdownFlavour: 'Github' },
      onLoad: () => logger.info('PluginManager', '[Export Plugin] Loaded into memory.'),
      onEnable: () => logger.info('PluginManager', '[Export Plugin] Bulk exports are now activated in Settings.'),
      onDisable: () => logger.info('PluginManager', '[Export Plugin] Advanced bulk exports disabled.'),
      onUnload: () => logger.info('PluginManager', '[Export Plugin] Purged from dynamic registries.')
    });

    // 2. Backup REST Plugin
    this.register({
      meta: {
        id: 'backup_rest_plugin',
        name: 'Durable REST Sync Mirror',
        version: '1.2.1',
        description: 'Automatically replicates local client partitions directly to standard REST mirror servers.',
        author: 'Operations Guild',
        requiredAppVersion: '>=1.2.0',
        permissions: ['api_network_access'],
        dependencies: []
      },
      state: 'unloaded',
      config: { mirrorUrl: 'https://backup.logeasy.app/sync', autoIntervalMin: 15 },
      onLoad: () => logger.info('PluginManager', '[Backup REST] Loaded into context.'),
      onEnable: () => logger.info('PluginManager', '[Backup REST] Initiating cron sync timers.'),
      onDisable: () => logger.info('PluginManager', '[Backup REST] Cancelled active synchronization cron timers.'),
      onUnload: () => logger.info('PluginManager', '[Backup REST] Cleared endpoints.')
    });

    // 3. AI Accent Translator
    this.register({
      meta: {
        id: 'ai_accent_translator',
        name: 'AI Vocal Accent Customizer',
        version: '0.9.5',
        description: 'Transforms the accent, cadence, and pitch of local Speech Synthesis and voice coaching outputs.',
        author: 'Acoustic Labs',
        requiredAppVersion: '>=1.0.0',
        permissions: ['audio_processing'],
        dependencies: ['export_journals_plugin'] // Simulates an extension dependency
      },
      state: 'unloaded',
      config: { voiceTone: 'Irish Warmth', speedModifier: 1.05 },
      onLoad: () => logger.info('PluginManager', '[Vocal Accent] Synthesis parameters mapped.'),
      onEnable: () => logger.info('PluginManager', '[Vocal Accent] Modifying default TTS speech channels.'),
      onDisable: () => logger.info('PluginManager', '[Vocal Accent] Reverted to standard neural voices.'),
      onUnload: () => logger.info('PluginManager', '[Vocal Accent] Purged accent resources.')
    });
  }

  // ============================================================================
  // COMPATIBILITY & RESOLUTION CHECKS
  // ============================================================================

  public register(plugin: PluginInstance) {
    if (this.plugins[plugin.meta.id]) {
      logger.warn('PluginManager', `Duplicate registration blocked for plugin ID: ${plugin.meta.id}`);
      return;
    }
    
    this.plugins[plugin.meta.id] = plugin;
    plugin.state = 'loaded';
    try {
      plugin.onLoad();
    } catch (err: any) {
      plugin.state = 'error';
      logger.error('PluginManager', `Failed execution during onLoad() for ${plugin.meta.id}: ${err.message}`);
    }
  }

  public getPlugins(): PluginInstance[] {
    return Object.values(this.plugins);
  }

  public getPlugin(id: string): PluginInstance | undefined {
    return this.plugins[id];
  }

  public enablePlugin(id: string): boolean {
    const plugin = this.plugins[id];
    if (!plugin) return false;
    if (plugin.state === 'enabled') return true;

    // 1. Dependency Resolution check
    for (const depId of plugin.meta.dependencies) {
      const dep = this.plugins[depId];
      if (!dep || dep.state !== 'enabled') {
        const errMsg = `Plugin Resolution Error: Cannot enable '${plugin.meta.name}'. Requires active dependent plugin '${depId}'`;
        logger.error('PluginManager', errMsg);
        alert(errMsg);
        return false;
      }
    }

    // 2. Version Verification Check
    if (!this.checkVersionCompatibility(plugin.meta.requiredAppVersion)) {
      const errMsg = `Plugin Version Mismatch: '${plugin.meta.name}' requires App version ${plugin.meta.requiredAppVersion}. Current: ${this.currentAppVersion}`;
      logger.error('PluginManager', errMsg);
      alert(errMsg);
      return false;
    }

    try {
      plugin.onEnable();
      plugin.state = 'enabled';
      logger.info('PluginManager', `Enabled plugin: ${plugin.meta.name}`);
      this.savePluginState(id, true);
      return true;
    } catch (err: any) {
      plugin.state = 'error';
      logger.error('PluginManager', `Failed during onEnable() for ${id}: ${err.message}`);
      return false;
    }
  }

  public disablePlugin(id: string): boolean {
    const plugin = this.plugins[id];
    if (!plugin) return false;
    if (plugin.state !== 'enabled') return true;

    // Check if other active plugins depend on this one
    for (const other of Object.values(this.plugins)) {
      if (other.state === 'enabled' && other.meta.dependencies.includes(id)) {
        const errMsg = `Plugin Conflict: Cannot disable '${plugin.meta.name}' as active plugin '${other.meta.name}' depends on it.`;
        logger.error('PluginManager', errMsg);
        alert(errMsg);
        return false;
      }
    }

    try {
      plugin.onDisable();
      plugin.state = 'disabled';
      logger.info('PluginManager', `Disabled plugin: ${plugin.meta.name}`);
      this.savePluginState(id, false);
      return true;
    } catch (err: any) {
      plugin.state = 'error';
      logger.error('PluginManager', `Failed during onDisable() for ${id}: ${err.message}`);
      return false;
    }
  }

  public updatePluginConfig(id: string, newConfig: Record<string, any>) {
    const plugin = this.plugins[id];
    if (plugin) {
      plugin.config = { ...plugin.config, ...newConfig };
      logger.info('PluginManager', `Updated parameter configuration schema for: ${plugin.meta.name}`);
      
      // If already active, trigger lifecycle toggles to load new configs
      if (plugin.state === 'enabled') {
        plugin.onDisable();
        plugin.onEnable();
      }
    }
  }

  private checkVersionCompatibility(required: string): boolean {
    // Elegant version comparison checks
    const reqClean = required.replace(/[^0-9.]/g, '');
    const currentParts = this.currentAppVersion.split('.').map(Number);
    const reqParts = reqClean.split('.').map(Number);

    for (let i = 0; i < 3; i++) {
      const cur = currentParts[i] || 0;
      const req = reqParts[i] || 0;
      if (cur > req) return true;
      if (cur < req) return false;
    }
    return true;
  }

  private savePluginState(id: string, isEnabled: boolean) {
    localStorage.setItem(`plugin_state_${id}`, isEnabled ? 'enabled' : 'disabled');
  }
}

export const pluginManager = PluginManager.getInstance();
