import { Truck, Store, UtensilsCrossed, Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useStoreConfig, useUpdateStoreConfig } from '@/hooks/useStore';
import { useToast } from '@/hooks/use-toast';

export function OperationModes() {
  const { data: store, isLoading } = useStoreConfig();
  const updateStore = useUpdateStoreConfig();
  const { toast } = useToast();

  const handleToggle = async (mode: 'mode_delivery_enabled' | 'mode_pickup_enabled' | 'mode_dine_in_enabled', value: boolean) => {
    if (!store?.id) return;
    
    try {
      await updateStore.mutateAsync({
        id: store.id,
        [mode]: value,
      });
      
      const modeNames = {
        mode_delivery_enabled: 'Delivery',
        mode_pickup_enabled: 'Retirada',
        mode_dine_in_enabled: 'Consumo no local',
      };
      
      toast({
        title: value ? `${modeNames[mode]} ativado` : `${modeNames[mode]} desativado`,
      });
    } catch (error) {
      toast({
        title: 'Erro ao atualizar',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl p-4 sm:p-6 shadow-card">
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const modes = [
    {
      id: 'mode_delivery_enabled' as const,
      label: 'Modo Delivery',
      description: 'Aceitar pedidos para entrega em domicílio',
      icon: Truck,
      enabled: store?.mode_delivery_enabled ?? true,
    },
    {
      id: 'mode_pickup_enabled' as const,
      label: 'Modo Retirada',
      description: 'Aceitar pedidos para retirada no balcão',
      icon: Store,
      enabled: store?.mode_pickup_enabled ?? true,
    },
    {
      id: 'mode_dine_in_enabled' as const,
      label: 'Modo Atendimento no Comércio',
      description: 'Aceitar pedidos para consumo nas mesas',
      icon: UtensilsCrossed,
      enabled: store?.mode_dine_in_enabled ?? true,
    },
  ];

  return (
    <div className="bg-card rounded-xl p-4 sm:p-6 shadow-card space-y-4">
      <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm sm:text-base">
        <Store className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
        Modos de Operação
      </h3>
      <p className="text-xs sm:text-sm text-muted-foreground">
        Selecione quais modalidades de atendimento estarão disponíveis para seus clientes.
      </p>

      <div className="space-y-3">
        {modes.map((mode) => (
          <div
            key={mode.id}
            className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/50"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${mode.enabled ? 'bg-primary/20' : 'bg-muted'}`}>
                <mode.icon className={`h-5 w-5 ${mode.enabled ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-foreground text-sm">{mode.label}</p>
                <p className="text-xs text-muted-foreground truncate">{mode.description}</p>
              </div>
            </div>
            <Switch
              checked={mode.enabled}
              onCheckedChange={(checked) => handleToggle(mode.id, checked)}
              disabled={updateStore.isPending}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
