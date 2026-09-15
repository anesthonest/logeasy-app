/**
 * LogEasy Analytics and Logger Foundation
 * Privacy-compliant central logging system with structured levels.
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  context: string;
  message: string;
  details?: any;
}

export interface AnalyticsEvent {
  eventName: string;
  timestamp: string;
  properties?: Record<string, any>;
}

class LoggerService {
  private static instance: LoggerService;
  private logs: LogEntry[] = [];
  private analyticsEvents: AnalyticsEvent[] = [];
  private onLogListeners: ((entry: LogEntry) => void)[] = [];

  private constructor() {
    this.info('LoggerService', 'LogEasy Analytics & Logger Initialized');
  }

  public static getInstance(): LoggerService {
    if (!LoggerService.instance) {
      LoggerService.instance = new LoggerService();
    }
    return LoggerService.instance;
  }

  private log(level: LogLevel, context: string, message: string, details?: any) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      context,
      message,
      details,
    };
    this.logs.push(entry);
    
    // Limit log memory buffer
    if (this.logs.length > 500) {
      this.logs.shift();
    }

    // Output to console based on level
    const consoleMsg = `[${entry.timestamp}] [${level}] [${context}] ${message}`;
    if (details) {
      console.log(consoleMsg, details);
    } else {
      console.log(consoleMsg);
    }

    // Trigger subscribers (e.g. for developer log terminal in dashboard)
    this.onLogListeners.forEach((listener) => listener(entry));
  }

  public debug(context: string, message: string, details?: any) {
    this.log(LogLevel.DEBUG, context, message, details);
  }

  public info(context: string, message: string, details?: any) {
    this.log(LogLevel.INFO, context, message, details);
  }

  public warn(context: string, message: string, details?: any) {
    this.log(LogLevel.WARN, context, message, details);
  }

  public error(context: string, message: string, details?: any) {
    this.log(LogLevel.ERROR, context, message, details);
  }

  public getLogs(): LogEntry[] {
    return [...this.logs];
  }

  public clearLogs() {
    this.logs = [];
    this.info('LoggerService', 'Logger cleared');
  }

  public subscribe(listener: (entry: LogEntry) => void): () => void {
    this.onLogListeners.push(listener);
    return () => {
      this.onLogListeners = this.onLogListeners.filter((l) => l !== listener);
    };
  }

  // --- PRIVACY COMPLIANT ANALYTICS ---
  public trackEvent(eventName: string, properties?: Record<string, any>) {
    // Sanitize properties to prevent leaking PII (Personally Identifiable Information)
    const sanitizedProps = this.sanitizePII(properties);
    const event: AnalyticsEvent = {
      eventName,
      timestamp: new Date().toISOString(),
      properties: sanitizedProps,
    };
    
    this.analyticsEvents.push(event);
    this.info('Analytics', `Tracked event: ${eventName}`, sanitizedProps);
  }

  public getAnalyticsEvents(): AnalyticsEvent[] {
    return [...this.analyticsEvents];
  }

  private sanitizePII(properties?: Record<string, any>): Record<string, any> | undefined {
    if (!properties) return undefined;
    const sanitized = { ...properties };
    const piiKeys = ['email', 'password', 'token', 'name', 'phone', 'voice', 'transcript', 'text'];
    
    for (const key of Object.keys(sanitized)) {
      if (piiKeys.some(pii => key.toLowerCase().includes(pii))) {
        sanitized[key] = '[REDACTED_FOR_PRIVACY]';
      }
    }
    return sanitized;
  }
}

export const logger = LoggerService.getInstance();
