import { Bell, BellOff, Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useWebPush } from '@/hooks/useWebPush';

interface PushNotificationToggleProps {
  variant?: 'switch' | 'button';
  userType?: 'admin' | 'driver' | 'waiter';
  userIdentifier?: string | null;
}

export function PushNotificationToggle({ variant = 'switch', userType = 'admin', userIdentifier }: PushNotificationToggleProps) {
  const { isSupported, isSubscribed, permission, isLoading, subscribe, unsubscribe } = useWebPush(userType, userIdentifier);

  if (!isSupported) return null;

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  if (variant === 'button') {
    return (
      <Button
        variant={isSubscribed ? 'default' : 'outline'}
        size="sm"
        onClick={handleToggle}
        className="gap-2"
        disabled={permission === 'denied' || isLoading}
        title={
          permission === 'denied'
            ? 'Permissão negada. Ative nas configurações do navegador.'
            : isSubscribed
              ? 'Notificações push ativas'
              : 'Ativar notificações push'
        }
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isSubscribed ? (
          <Bell className="h-4 w-4" />
        ) : (
          <BellOff className="h-4 w-4" />
        )}
        <span className="hidden sm:inline">{isSubscribed ? 'Push On' : 'Ativar Push'}</span>
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-primary" />
      ) : isSubscribed ? (
        <Bell className="w-4 h-4 text-primary" />
      ) : (
        <BellOff className="w-4 h-4 text-muted-foreground" />
      )}
      <Switch
        checked={isSubscribed}
        onCheckedChange={handleToggle}
        disabled={permission === 'denied' || isLoading}
        className="data-[state=checked]:bg-primary"
      />
    </div>
  );
}
