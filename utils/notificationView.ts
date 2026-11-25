import type { AppNotification } from '../types';
export type NotificationFilter = 'all' | 'unread';
export function notificationView(items: AppNotification[], filter: NotificationFilter) {
 const unread=items.filter(item=>!item.isRead);
 return {items:filter==='unread'?unread:items,unread:unread.length};
}
export function markNotificationsRead(items: AppNotification[]): AppNotification[] {
 return items.map(item=>item.isRead?item:{...item,isRead:true});
}
