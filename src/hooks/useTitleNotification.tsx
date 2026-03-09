import { useEffect, useRef } from 'react';

export function useTitleNotification(pendingCount: number, baseTitle: string = 'Admin') {
  const originalTitle = useRef(document.title);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (pendingCount > 0) {
      let showNotification = true;
      
      // Blink the title
      intervalRef.current = setInterval(() => {
        if (showNotification) {
          document.title = `🔔 (${pendingCount}) Novo(s) Pedido(s)!`;
        } else {
          document.title = baseTitle;
        }
        showNotification = !showNotification;
      }, 1000);
    } else {
      document.title = baseTitle;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      document.title = originalTitle.current;
    };
  }, [pendingCount, baseTitle]);
}
