import { MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { StoreConfig } from '@/hooks/useStore';
import { useStoreStatus } from '@/hooks/useStoreStatus';

interface StoreHeaderProps {
  store: StoreConfig;
}

export function StoreHeader({ store }: StoreHeaderProps) {
  const storeStatus = useStoreStatus();

  return (
    <header className="sticky top-0 z-40 bg-card shadow-card">
      <div className="px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-bold text-xl shadow-card overflow-hidden">
            {store.logo_url ? (
              <img 
                src={store.logo_url} 
                alt={`Logo ${store.name}`}
                className="h-full w-full object-cover"
              />
            ) : (
              <span>🍔</span>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-foreground">{store.name}</h1>
              <Badge variant={storeStatus.isOpen ? 'open' : 'closed'}>
                {storeStatus.isOpen ? 'Aberto' : 'Fechado'}
              </Badge>
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              <span>
                {store.address 
                  ? `${store.address.length > 30 ? store.address.substring(0, 30) + '...' : store.address}` 
                  : `Entrega • Taxa R$ ${Number(store.delivery_fee).toFixed(2).replace('.', ',')}`
                }
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
