import { useEffect, useRef } from 'react';
import { useWebPush } from './useWebPush';

/**
 * Automatically prompts the user to enable push notifications
 * on first interaction with the page (click/touch).
 * Only prompts once per session per userType.
 */
export function useAutoPromptPush(userType: 'admin' | 'driver' | 'waiter', userIdentifier?: string | null) {
  const { isSupported, isSubscribed, permission, subscribe } = useWebPush(userType, userIdentifier);
  const promptedRef = useRef(false);

  useEffect(() => {
    if (!isSupported || isSubscribed || permission === 'denied' || promptedRef.current) return;

    const sessionKey = `push-prompted-${userType}`;
    if (sessionStorage.getItem(sessionKey)) return;

    const handler = async () => {
      promptedRef.current = true;
      sessionStorage.setItem(sessionKey, '1');
      window.removeEventListener('click', handler);
      window.removeEventListener('touchstart', handler);
      
      // Small delay to not interfere with the user's click action
      setTimeout(() => {
        subscribe();
      }, 500);
    };

    window.addEventListener('click', handler, { once: true });
    window.addEventListener('touchstart', handler, { once: true });

    return () => {
      window.removeEventListener('click', handler);
      window.removeEventListener('touchstart', handler);
    };
  }, [isSupported, isSubscribed, permission, subscribe, userType]);
}
