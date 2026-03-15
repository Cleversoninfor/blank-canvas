import { useEffect } from 'react';
import { useNotificationSound } from './useNotificationSound';

/**
 * Listens for messages from the Service Worker when a push notification arrives
 * while the page is in the foreground, and triggers the alarm sound.
 */
export function useServiceWorkerPush() {
  const { startAlarm } = useNotificationSound();

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'PUSH_RECEIVED') {
        console.log('[SW Push] Received push in foreground, playing alarm');
        startAlarm();
      }
    };

    navigator.serviceWorker.addEventListener('message', handler);
    return () => {
      navigator.serviceWorker.removeEventListener('message', handler);
    };
  }, [startAlarm]);
}
