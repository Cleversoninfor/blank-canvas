import { useState, useEffect } from 'react';
import { Truck, Store, Loader2, KeyRound, Save, UtensilsCrossed } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useStoreConfig, useUpdateStoreConfig } from '@/hooks/useStore';
import { useSystemSettings, useUpdateSystemSettings } from '@/hooks/useSystemSettings';
import { useToast } from '@/hooks/use-toast';

export function OperationModes() {
  const { data: store, isLoading } = useStoreConfig();
  const updateStore = useUpdateStoreConfig();
  const { data: systemSettings, isLoading: isLoadingSettings } = useSystemSettings();
  const updateSystemSettings = useUpdateSystemSettings();
  const { toast } = useToast();
  const [pdvPassword, setPdvPassword] = useState('');

  useEffect(() => {
    if (store?.pdv_password) {
      setPdvPassword(store.pdv_password);
    }
  }, [store?.pdv_password]);

  const handleToggle = async (mode: 'mode_delivery_enabled' | 'mode_pickup_enabled', value: boolean) => {
    if (!store) return;
    
    try {
      await updateStore.mutateAsync({
        ...(store.id ? { id: store.id } : {}),
        [mode]: value,
      });
      
      const modeNames = {
        mode_delivery_enabled: 'Delivery',
        mode_pickup_enabled: 'Retirada',
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

  const handleConsumeOnSiteToggle = async (value: boolean) => {
    try {
      await updateSystemSettings.mutateAsync({ consume_on_site_enabled: value });
      toast({
        title: value ? 'Consumir no Local ativado' : 'Consumir no Local desativado',
      });
    } catch (error) {
      toast({
        title: 'Erro ao atualizar',
        variant: 'destructive',
      });
    }
  };

  if (isLoading || isLoadingSettings) {
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
  ];

  const consumeOnSiteEnabled = systemSettings?.consume_on_site_enabled ?? true;

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

        {/* Consumir no Local */}
        <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${consumeOnSiteEnabled ? 'bg-primary/20' : 'bg-muted'}`}>
              <UtensilsCrossed className={`h-5 w-5 ${consumeOnSiteEnabled ? 'text-primary' : 'text-muted-foreground'}`} />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-foreground text-sm">Ativar Consumir no Local</p>
              <p className="text-xs text-muted-foreground truncate">Exibir opção de pedido para consumo no local no cardápio</p>
            </div>
          </div>
          <Switch
            checked={consumeOnSiteEnabled}
            onCheckedChange={handleConsumeOnSiteToggle}
            disabled={updateSystemSettings.isPending}
          />
        </div>
      </div>

      {/* Senha PDV */}
      <div className="border-t border-border pt-4 mt-4 space-y-3">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-primary" />
          <p className="font-medium text-foreground text-sm">Senha PDV</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Defina uma senha para acesso ao PDV pela rota /pdv. Máximo de 8 caracteres.
        </p>
        <Input
          type="text"
          placeholder="Senha do PDV"
          value={pdvPassword}
          onChange={(e) => setPdvPassword(e.target.value.slice(0, 8))}
          maxLength={8}
          className="max-w-xs"
        />
        <p className="text-xs text-muted-foreground">{pdvPassword.length}/8 caracteres</p>
        <Button
          size="sm"
          disabled={updateStore.isPending}
          onClick={async () => {
            if (!store) return;
            try {
              await updateStore.mutateAsync({
                ...(store.id ? { id: store.id } : {}),
                pdv_password: pdvPassword || null,
              } as any);
              toast({ title: 'Senha PDV salva com sucesso!' });
            } catch {
              toast({ title: 'Erro ao salvar senha', variant: 'destructive' });
            }
          }}
        >
          {updateStore.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar Configurações
        </Button>
      </div>
    </div>
  );
}
