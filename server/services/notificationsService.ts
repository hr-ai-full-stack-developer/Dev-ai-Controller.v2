import type { NotificationItem } from '../../src/types/index.js';

let notificationsList: NotificationItem[] = [];

export async function listNotifications(limit: number = 30): Promise<NotificationItem[]> {
  return notificationsList.slice(0, limit);
}

export async function createNotification(
  item: Omit<NotificationItem, 'id' | 'timestamp'>
): Promise<NotificationItem> {
  const newNotif: NotificationItem = {
    ...item,
    id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    timestamp: new Date().toISOString(),
  };
  notificationsList.unshift(newNotif);
  return newNotif;
}
