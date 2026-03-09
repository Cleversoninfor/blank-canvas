import { Volume2, VolumeX } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useNotificationSound } from '@/hooks/useNotificationSound';

interface SoundNotificationToggleProps {
  variant?: 'switch' | 'button';
}

export function SoundNotificationToggle({ variant = 'switch' }: SoundNotificationToggleProps) {
  const { isEnabled, setEnabled, stopAlarm, isAlarmPlaying } = useNotificationSound();

  const handleToggle = (checked: boolean) => {
    console.log('[SoundNotificationToggle] Toggle clicked, setting to:', checked);
    setEnabled(checked);
    if (!checked && isAlarmPlaying) {
      stopAlarm();
    }
  };

  const handleButtonClick = () => {
    handleToggle(!isEnabled);
  };

  if (variant === 'button') {
    return (
      <Button
        variant={isEnabled ? 'default' : 'outline'}
        size="sm"
        onClick={handleButtonClick}
        className="gap-2"
        title={isEnabled ? 'Som de notificações ativado' : 'Som de notificações desativado'}
      >
        {isEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        <span className="hidden sm:inline">{isEnabled ? 'Som On' : 'Som Off'}</span>
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
      {isEnabled ? <Volume2 className="w-4 h-4 text-primary" /> : <VolumeX className="w-4 h-4 text-muted-foreground" />}
      <Switch checked={isEnabled} onCheckedChange={handleToggle} className="data-[state=checked]:bg-primary" />
    </div>
  );
}
