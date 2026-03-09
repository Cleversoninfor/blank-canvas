import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { 
  ChefHat, 
  Clock, 
  CheckCircle, 
  RefreshCw, 
  Volume2, 
  VolumeX,
  Loader2,
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { KitchenOrderCard, groupItemsByOrder, GroupedKitchenOrder } from '@/components/kitchen/KitchenOrderCard';
import { PWAInstallButton } from '@/components/pwa/PWAInstallButton';
import { useKitchenItems } from '@/hooks/useKitchenItems';
import { useStoreConfig } from '@/hooks/useStore';
import { useTheme } from '@/hooks/useTheme';
import { usePWAConfig } from '@/hooks/usePWAConfig';

export default function Kitchen() {
  const navigate = useNavigate();
  const { data: store } = useStoreConfig();
  const { items, isLoading, error } = useKitchenItems();
  const [activeTab, setActiveTab] = useState<'pending' | 'preparing' | 'ready'>('pending');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastItemCount, setLastItemCount] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useTheme();
  usePWAConfig();

  // Create audio context for notification sound
  useEffect(() => {
    audioRef.current = new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU');
  }, []);

  // Play sound when new items arrive
  useEffect(() => {
    const pendingCount = items.filter(i => i.status === 'pending').length;
    if (pendingCount > lastItemCount && soundEnabled && lastItemCount !== 0) {
      // Play notification sound
      try {
        const audioContext = new AudioContext();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        gainNode.gain.value = 0.3;
        
        oscillator.start();
        setTimeout(() => {
          oscillator.stop();
          audioContext.close();
        }, 200);
      } catch (e) {
        console.log('Audio not supported');
      }
    }
    setLastItemCount(pendingCount);
  }, [items, soundEnabled, lastItemCount]);

  // Prevent screen from sleeping
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;
    
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen');
        }
      } catch (e) {
        console.log('Wake lock not supported');
      }
    };

    requestWakeLock();

    return () => {
      if (wakeLock) {
        wakeLock.release();
      }
    };
  }, []);

  // Group items by order
  const groupedOrders = groupItemsByOrder(items);

  // Filter grouped orders by status
  const pendingOrders = groupedOrders.filter(o => o.status === 'pending');
  const preparingOrders = groupedOrders.filter(o => o.status === 'preparing');
  const readyOrders = groupedOrders.filter(o => o.status === 'ready');

  const currentOrders = activeTab === 'pending' 
    ? pendingOrders 
    : activeTab === 'preparing' 
      ? preparingOrders 
      : readyOrders;

  return (
    <>
      <Helmet>
        <title>Cozinha - {store?.name || 'Restaurante'}</title>
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-card border-b border-border px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ChefHat className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Cozinha</h1>
                <p className="text-sm text-muted-foreground">{store?.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <PWAInstallButton appName="Cozinha" />
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => setSoundEnabled(!soundEnabled)}
              >
                {soundEnabled ? (
                  <Volume2 className="h-5 w-5" />
                ) : (
                  <VolumeX className="h-5 w-5" />
                )}
              </Button>
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => window.location.reload()}
              >
                <RefreshCw className="h-5 w-5" />
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate('/admin')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Admin
              </Button>
            </div>
          </div>
        </header>

        {error && (
          <div className="mx-4 mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-4">
            <p className="text-sm font-medium text-foreground">Erro ao carregar pedidos</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {error instanceof Error ? error.message : 'Tente recarregar a página.'}
            </p>
          </div>
        )}

        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50">
          <div 
            className={`rounded-xl p-4 text-center cursor-pointer transition-all ${
              activeTab === 'pending' 
                ? 'bg-amber-200 ring-2 ring-amber-500' 
                : 'bg-amber-100'
            }`}
            onClick={() => setActiveTab('pending')}
          >
            <Clock className="h-8 w-8 text-amber-700 mx-auto mb-2" />
            <p className="text-3xl font-bold text-amber-800">{pendingOrders.length}</p>
            <p className="text-sm text-amber-700 font-medium">Pendentes</p>
          </div>
          <div 
            className={`rounded-xl p-4 text-center cursor-pointer transition-all ${
              activeTab === 'preparing' 
                ? 'bg-blue-200 ring-2 ring-blue-500' 
                : 'bg-blue-100'
            }`}
            onClick={() => setActiveTab('preparing')}
          >
            <ChefHat className="h-8 w-8 text-blue-700 mx-auto mb-2" />
            <p className="text-3xl font-bold text-blue-800">{preparingOrders.length}</p>
            <p className="text-sm text-blue-700 font-medium">Preparando</p>
          </div>
          <div 
            className={`rounded-xl p-4 text-center cursor-pointer transition-all ${
              activeTab === 'ready' 
                ? 'bg-green-200 ring-2 ring-green-500' 
                : 'bg-green-100'
            }`}
            onClick={() => setActiveTab('ready')}
          >
            <CheckCircle className="h-8 w-8 text-green-700 mx-auto mb-2" />
            <p className="text-3xl font-bold text-green-800">{readyOrders.length}</p>
            <p className="text-sm text-green-700 font-medium">Prontos</p>
          </div>
        </div>

        {/* Items Grid */}
        <div className="p-4">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          ) : currentOrders.length === 0 ? (
            <div className="text-center py-16">
              <div className="mx-auto mb-4 h-20 w-20 rounded-full bg-muted flex items-center justify-center">
                {activeTab === 'pending' && <Clock className="h-10 w-10 text-muted-foreground" />}
                {activeTab === 'preparing' && <ChefHat className="h-10 w-10 text-muted-foreground" />}
                {activeTab === 'ready' && <CheckCircle className="h-10 w-10 text-muted-foreground" />}
              </div>
              <p className="text-xl text-muted-foreground">
                {activeTab === 'pending' && 'Nenhum pedido pendente'}
                {activeTab === 'preparing' && 'Nenhum pedido em preparo'}
                {activeTab === 'ready' && 'Nenhum pedido pronto'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {currentOrders.map((order) => (
                <KitchenOrderCard key={order.orderKey} order={order} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
