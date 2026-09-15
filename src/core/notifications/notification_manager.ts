/**
 * LogEasy Notification Foundation
 * Configures push simulation, reminder triggers, and schedules local notifications.
 */

import { logger } from '../analytics/logger';

export interface LocalNotification {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  isRead: boolean;
  type: 'system' | 'reminder' | 'sync' | 'security';
}

class NotificationManager {
  private static instance: NotificationManager;
  private notificationsList: LocalNotification[] = [];
  private changeListeners: ((list: LocalNotification[]) => void)[] = [];

  private constructor() {
    this.addNotification({
      title: 'LogEasy Ready',
      body: 'Your encrypted voice journaling vault is secure. Speak freely.',
      type: 'system',
    });
  }

  public static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  public async requestPermissions(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      logger.warn('NotificationManager', 'Web Notifications not supported on this device browser.');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      logger.info('NotificationManager', `Notification permission: ${permission}`);
      return permission === 'granted';
    } catch (e) {
      logger.error('NotificationManager', 'Failed to request notification permissions', e);
      return false;
    }
  }

  public addNotification(item: Omit<LocalNotification, 'id' | 'timestamp' | 'isRead'>) {
    const notification: LocalNotification = {
      ...item,
      id: Math.random().toString(36).substring(2, 11),
      timestamp: new Date().toISOString(),
      isRead: false,
    };
    
    this.notificationsList.unshift(notification);
    
    if (this.notificationsList.length > 50) {
      this.notificationsList.pop();
    }

    logger.info('NotificationManager', `Received notification [${notification.type}]: ${notification.title}`);

    // If browser permission is granted, fire native alert
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.body,
        icon: '/favicon.ico',
      });
    }

    this.notifyListeners();
  }

  public getNotifications(): LocalNotification[] {
    return [...this.notificationsList];
  }

  public markAsRead(id: string) {
    this.notificationsList = this.notificationsList.map((n) =>
      n.id === id ? { ...n, isRead: true } : n
    );
    this.notifyListeners();
  }

  public markAllAsRead() {
    this.notificationsList = this.notificationsList.map((n) => ({ ...n, isRead: true }));
    this.notifyListeners();
  }

  public clearNotifications() {
    this.notificationsList = [];
    this.notifyListeners();
  }

  public subscribe(listener: (list: LocalNotification[]) => void): () => void {
    this.changeListeners.push(listener);
    listener(this.getNotifications());
    return () => {
      this.changeListeners = this.changeListeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners() {
    this.changeListeners.forEach((l) => l(this.getNotifications()));
  }

  /**
   * Schedules a reminder notification simulation
   */
  public scheduleDailyReminder(hour: number, minute: number): void {
    logger.info('NotificationManager', `Scheduled daily reflective journal reminders for ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
    
    // In a fully native hybrid container (e.g. Flutter FCM), this schedules local OS alarms.
    // In a web context, we log and prepare the cron structure.
  }
}

export const notificationManager = NotificationManager.getInstance();
