import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

type NotificationPermission = 'default' | 'granted' | 'denied';

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check if notifications are supported
    const supported = 'Notification' in window;
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      toast.error('Seu navegador não suporta notificações');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        toast.success('Notificações ativadas!');
        // Show test notification
        new Notification('Burger House', {
          body: 'Notificações ativadas com sucesso!',
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: 'test-notification',
        });
        return true;
      } else if (result === 'denied') {
        toast.error('Permissão negada. Ative nas configurações do navegador.');
        return false;
      }
      
      return false;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast.error('Erro ao solicitar permissão de notificação');
      return false;
    }
  }, [isSupported]);

  const sendNotification = useCallback(async (title: string, options?: NotificationOptions) => {
    if (!isSupported || permission !== 'granted') {
      console.log('Notifications not available or not permitted');
      return null;
    }

    try {
      // Use Service Worker notification for better background/locked screen support
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title, {
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          requireInteraction: true,
          renotify: true,
          tag: options?.tag || 'default',
          vibrate: [300, 100, 300, 100, 300, 100, 300],
          silent: false,
          ...options,
        } as NotificationOptions);
        return null;
      }

      // Fallback to regular Notification API
      const notification = new Notification(title, {
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        requireInteraction: true,
        ...options,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
        if (window.location.pathname !== '/admin/orders') {
          window.location.href = '/admin/orders';
        }
      };

      return notification;
    } catch (error) {
      console.error('Error sending notification:', error);
      return null;
    }
  }, [isSupported, permission]);

  const notifyNewOrder = useCallback((orderCount: number) => {
    return sendNotification('🍔 Novo Pedido!', {
      body: `Você tem ${orderCount} pedido(s) pendente(s)`,
      tag: 'new-order',
    } as NotificationOptions);
  }, [sendNotification]);

  return {
    permission,
    isSupported,
    isEnabled: permission === 'granted',
    requestPermission,
    sendNotification,
    notifyNewOrder,
  };
}
