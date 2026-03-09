import { useEffect, useRef, useCallback, useState } from 'react';
import { useNotificationSound } from './useNotificationSound';

const SEEN_ORDERS_KEY = 'driver_seen_order_ids';

function getSeenOrderIds(): Set<number> {
  try {
    const raw = localStorage.getItem(SEEN_ORDERS_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as number[]);
  } catch {
    return new Set();
  }
}

function persistSeenOrderIds(ids: Set<number>) {
  localStorage.setItem(SEEN_ORDERS_KEY, JSON.stringify([...ids]));
}

async function sendPushNotification(count: number) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification('🚚 Novo Pedido de Entrega', {
        body: count === 1
          ? 'Você recebeu um novo pedido. Toque para visualizar.'
          : `Você recebeu ${count} novos pedidos. Toque para visualizar.`,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'driver-new-order',
        renotify: true,
        requireInteraction: true,
        vibrate: [300, 100, 300, 100, 300, 100, 300],
      } as NotificationOptions);
    } else {
      new Notification('🚚 Novo Pedido de Entrega', {
        body: 'Você recebeu um novo pedido. Toque para visualizar.',
        icon: '/icon-192.png',
      });
    }
  } catch (e) {
    console.warn('[DriverNotif] push failed', e);
  }
}

export function useDriverNotifications(orders: any[] | undefined) {
  const seenRef = useRef(getSeenOrderIds());
  const initializedRef = useRef(false);
  const [newOrderIds, setNewOrderIds] = useState<Set<number>>(new Set());
  const [permissionGranted, setPermissionGranted] = useState(
    typeof Notification !== 'undefined' && Notification.permission === 'granted'
  );

  const { startAlarm, stopAlarm } = useNotificationSound();

  // Request notification permission
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      setPermissionGranted(true);
      return;
    }
    if (Notification.permission === 'denied') return;
    const result = await Notification.requestPermission();
    setPermissionGranted(result === 'granted');
  }, []);

  // On first user interaction, request permission
  useEffect(() => {
    const handler = () => {
      requestPermission();
      window.removeEventListener('click', handler);
      window.removeEventListener('touchstart', handler);
    };
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      window.addEventListener('click', handler, { once: true });
      window.addEventListener('touchstart', handler, { once: true });
      return () => {
        window.removeEventListener('click', handler);
        window.removeEventListener('touchstart', handler);
      };
    }
  }, [requestPermission]);

  // Detect new orders
  useEffect(() => {
    if (!orders || orders.length === 0) return;

    const currentIds = new Set(orders.map((o: any) => o.id as number));

    // First load: mark all current orders as seen (don't alert on refresh)
    if (!initializedRef.current) {
      initializedRef.current = true;
      currentIds.forEach((id) => seenRef.current.add(id));
      persistSeenOrderIds(seenRef.current);
      const readyIds = new Set(
        orders.filter((o: any) => o.status === 'ready').map((o: any) => o.id as number)
      );
      setNewOrderIds(readyIds);
      return;
    }

    // Find truly new orders (not seen before)
    const brandNew: number[] = [];
    currentIds.forEach((id) => {
      if (!seenRef.current.has(id)) {
        brandNew.push(id);
        seenRef.current.add(id);
      }
    });

    if (brandNew.length > 0) {
      persistSeenOrderIds(seenRef.current);

      // Start the same alarm sound used in admin orders
      startAlarm();

      // Send push notification
      sendPushNotification(brandNew.length);

      // Add to visual "new" set
      setNewOrderIds((prev) => {
        const next = new Set(prev);
        brandNew.forEach((id) => next.add(id));
        return next;
      });
    }

    // Clean up seen IDs that are no longer in the order list (completed)
    const toRemove: number[] = [];
    seenRef.current.forEach((id) => {
      if (!currentIds.has(id)) toRemove.push(id);
    });
    if (toRemove.length > 0) {
      toRemove.forEach((id) => seenRef.current.delete(id));
      persistSeenOrderIds(seenRef.current);
    }
  }, [orders, startAlarm]);

  // Mark order as acknowledged (when driver clicks "Iniciar Entrega") and stop alarm
  const acknowledgeOrder = useCallback((orderId: number) => {
    setNewOrderIds((prev) => {
      const next = new Set(prev);
      next.delete(orderId);
      // Stop alarm when all new orders are acknowledged
      if (next.size === 0) {
        stopAlarm();
      }
      return next;
    });
  }, [stopAlarm]);

  return {
    newOrderIds,
    acknowledgeOrder,
    permissionGranted,
    requestPermission,
  };
}
