import { LayoutGrid, List } from 'lucide-react';
import { useStoreConfig, useUpdateStoreConfig } from '@/hooks/useStore';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export function MenuLayoutSettings() {
  const { data: store } = useStoreConfig();
  const updateStore = useUpdateStoreConfig();
  const { toast } = useToast();

  const currentLayout = store?.menu_layout || 'list';

  const handleChange = async (layout: string) => {
    if (!store?.id || layout === currentLayout) return;
    try {
      await updateStore.mutateAsync({ id: store.id, menu_layout: layout } as any);
      toast({ title: layout === 'list' ? 'Modo Lista ativado' : 'Modo Somente Categoria ativado' });
    } catch {
      toast({ title: 'Erro ao alterar layout', variant: 'destructive' });
    }
  };

  const options = [
    {
      value: 'list',
      label: 'Modo Lista',
      description: 'Mostra todas as categorias e produtos em sequência',
      icon: List,
    },
    {
      value: 'category',
      label: 'Somente Categoria',
      description: 'Mostra cards grandes de categorias. Ao clicar, exibe os produtos',
      icon: LayoutGrid,
    },
  ];

  return (
    <div className="bg-card rounded-xl p-4 sm:p-6 shadow-card space-y-4">
      <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm sm:text-base">
        <LayoutGrid className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
        Layout do Cardápio
      </h3>
      <p className="text-xs text-muted-foreground">
        Escolha como os produtos serão exibidos no cardápio para seus clientes
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {options.map((opt) => {
          const isActive = currentLayout === opt.value;
          const Icon = opt.icon;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleChange(opt.value)}
              disabled={updateStore.isPending}
              className={cn(
                'relative flex flex-col items-center gap-3 rounded-xl border-2 p-5 transition-all text-left',
                isActive
                  ? 'border-primary bg-primary/5 shadow-md'
                  : 'border-border bg-card hover:border-primary/40 hover:bg-muted/50'
              )}
            >
              {isActive && (
                <span className="absolute top-2 right-2 h-3 w-3 rounded-full bg-primary" />
              )}
              <div
                className={cn(
                  'h-12 w-12 rounded-xl flex items-center justify-center',
                  isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                )}
              >
                <Icon className="h-6 w-6" />
              </div>
              <div className="text-center">
                <p className={cn('font-semibold text-sm', isActive ? 'text-primary' : 'text-foreground')}>
                  {opt.label}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{opt.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
