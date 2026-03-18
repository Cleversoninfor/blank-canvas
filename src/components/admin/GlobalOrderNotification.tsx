import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAllOrders } from '@/hooks/useAllOrders';
import { useOrdersRealtime } from '@/hooks/useOrdersRealtime';
import { useNotificationSound } from '@/hooks/useNotificationSound';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useServiceWorkerPush } from '@/hooks/useServiceWorkerPush';

export function GlobalOrderNotification() {
  const location = useLocation();
  const { data: orders } = useAllOrders();
  const { startAlarm, stopAlarm, isEnabled: soundEnabled } = useNotificationSound();
  const { notifyNewOrder } = usePushNotifications();
  
  const [newOrderDialogOpen, setNewOrderDialogOpen] = useState(false);
  const lastPendingCountRef = useRef<number | null>(null);
  
  // Enable realtime updates
  useOrdersRealtime(true);

  // Listen for push notifications from SW to play alarm in foreground
  useServiceWorkerPush();

  // Don't show notifications on kitchen page
  const isKitchenPage = location.pathname === '/kitchen';

  const pendingCount = orders?.filter((o) => o.status === 'pending').length || 0;

  useEffect(() => {
    // Skip if on kitchen page OR if orders are still loading for the first time
    if (isKitchenPage || orders === undefined) return;

    // Initialize on first successful load
    if (lastPendingCountRef.current === null) {
      console.log('[GlobalOrderNotification] Initializing lastPendingCount:', pendingCount);
      lastPendingCountRef.current = pendingCount;
      return;
    }

    // Check for new pending orders
    if (pendingCount > lastPendingCountRef.current) {
      console.log('[GlobalOrderNotification] New order detected! Pending:', pendingCount, 'Last:', lastPendingCountRef.current);
      // New order detected!
      setNewOrderDialogOpen(true);
      if (soundEnabled) {
        startAlarm();
      }
      notifyNewOrder(pendingCount);
    }

    lastPendingCountRef.current = pendingCount;
  }, [pendingCount, soundEnabled, startAlarm, notifyNewOrder, isKitchenPage, orders]);

  // Stop alarm if sound is disabled while playing
  useEffect(() => {
    if (!soundEnabled && newOrderDialogOpen) {
      stopAlarm();
    }
  }, [soundEnabled, newOrderDialogOpen, stopAlarm]);

  const handleAcknowledgeNewOrder = () => {
    console.log('[GlobalOrderNotification] OK clicked, stopping alarm');
    // Stop alarm immediately and synchronously
    stopAlarm();
    // Small delay to ensure audio context is fully stopped before closing dialog
    setTimeout(() => {
      setNewOrderDialogOpen(false);
    }, 50);
  };

  // Don't render on kitchen page
  if (isKitchenPage) return null;

  return (
    <AlertDialog open={newOrderDialogOpen} onOpenChange={() => {}}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-2xl flex items-center gap-2">
            🍔 Novo Pedido!
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            Você tem {pendingCount} pedido(s) pendente(s) aguardando confirmação.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogAction
          onClick={handleAcknowledgeNewOrder}
          className="w-full text-lg py-6"
        >
          OK
        </AlertDialogAction>
      </AlertDialogContent>
    </AlertDialog>
  );
}
