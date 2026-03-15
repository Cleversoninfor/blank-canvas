import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { LogOut, Loader2, Truck, MapPin, Phone, User, CreditCard, Navigation, Play, CheckCircle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { PushNotificationToggle } from '@/components/admin/PushNotificationToggle';
import { useStoreConfig } from '@/hooks/useStore';
import { useTheme } from '@/hooks/useTheme';
import { usePWAConfig } from '@/hooks/usePWAConfig';
import { useDriverOrders, useDriverOrderItems } from '@/hooks/useDrivers';
import { useDriverNotifications } from '@/hooks/useDriverNotifications';
import { useServiceWorkerPush } from '@/hooks/useServiceWorkerPush';
import { useAutoPromptPush } from '@/hooks/useAutoPromptPush';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

function DriverOrderCard({ order, isNew, onAcknowledge }: { order: any; isNew: boolean; onAcknowledge: (id: number) => void }) {
  const { data: items } = useDriverOrderItems(order.id);
  const [isUpdating, setIsUpdating] = useState(false);

  const formatCurrency = (value: number) =>
    Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const paymentLabels: Record<string, string> = {
    pix: '💠 PIX',
    money: '💵 Dinheiro',
    card: '💳 Cartão',
    credit: '💳 Crédito',
    debit: '💳 Débito',
  };

  const driverId = localStorage.getItem('driver_id');

  const handleStartDelivery = async () => {
    setIsUpdating(true);
    try {
      const { error } = await supabase.rpc('driver_update_order_status', {
        _order_id: order.id,
        _driver_id: driverId,
        _new_status: 'delivery',
      });
      if (error) throw error;
      onAcknowledge(order.id);
      toast.success('Entrega iniciada!');
    } catch (err: any) {
      console.error('Start delivery error:', err);
      toast.error('Erro ao iniciar entrega');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleFinishDelivery = async () => {
    setIsUpdating(true);
    try {
      const { error } = await supabase.rpc('driver_update_order_status', {
        _order_id: order.id,
        _driver_id: driverId,
        _new_status: 'completed',
      });
      if (error) throw error;
      toast.success('Entrega finalizada!');
    } catch (err: any) {
      console.error('Finish delivery error:', err);
      toast.error('Erro ao finalizar entrega');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card className={`border-2 ${isNew ? 'border-primary ring-2 ring-primary/30 animate-pulse' : 'border-border'}`}>
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg text-foreground">Pedido #{order.id}</span>
            {isNew && (
              <Badge className="bg-primary text-primary-foreground text-xs">NOVO</Badge>
            )}
          </div>
          <Badge variant={order.status === 'ready' ? 'secondary' : 'default'} className={order.status === 'delivery' ? 'bg-purple-600 text-white' : ''}>
            {order.status === 'ready' ? '🍳 Pronto' : '🛵 Em Entrega'}
          </Badge>
        </div>

        {/* Customer */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{order.customer_name}</span>
          </div>
          {order.customer_phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <a href={`tel:${order.customer_phone}`} className="text-primary underline">
                {order.customer_phone}
              </a>
            </div>
          )}
        </div>

        {/* Address */}
        <div className="flex gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">
              {order.address_street}, {order.address_number}
            </p>
            {order.address_complement && <p className="text-sm text-muted-foreground">{order.address_complement}</p>}
            <p className="text-sm text-muted-foreground">{order.address_neighborhood}</p>
            {order.address_reference && <p className="text-sm text-muted-foreground italic">Ref: {order.address_reference}</p>}
          </div>
        </div>

        {/* Google Maps */}
        {order.latitude && order.longitude && (
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2"
            onClick={() => {
              const lat = Number(order.latitude);
              const lng = Number(order.longitude);
              window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
            }}
          >
            <Navigation className="h-4 w-4" />
            Abrir no Google Maps
          </Button>
        )}

        {/* Payment */}
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-muted-foreground" />
          <span>{paymentLabels[order.payment_method] || order.payment_method}</span>
          {order.payment_method === 'money' && order.change_for && (
            <span className="text-muted-foreground">(Troco p/ {formatCurrency(order.change_for)})</span>
          )}
        </div>

        {/* Items */}
        <div className="space-y-1 border-t border-border pt-2">
          <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
            <FileText className="h-3 w-3" /> ITENS
          </p>
          {items?.map((item: any) => (
            <div key={item.id}>
              <span className="text-sm">
                {item.quantity}x {item.product_name}
              </span>
              {item.observation && <p className="text-xs text-warning">📝 {item.observation}</p>}
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="flex justify-between items-center border-t border-border pt-2">
          <span className="font-semibold">Total</span>
          <span className="font-bold text-primary text-lg">{formatCurrency(order.total_amount)}</span>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-1">
          {order.status === 'ready' && (
            <Button className="flex-1 gap-2" onClick={handleStartDelivery} disabled={isUpdating}>
              {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Iniciar Entrega
            </Button>
          )}
          {order.status === 'delivery' && (
            <Button className="flex-1 gap-2 bg-green-600 hover:bg-green-700 text-white" onClick={handleFinishDelivery} disabled={isUpdating}>
              {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              Finalizar Entrega
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function DriverDashboard() {
  const navigate = useNavigate();
  const { data: store } = useStoreConfig();

  useTheme();
  usePWAConfig();

  const driverId = localStorage.getItem('driver_id');
  const driverName = localStorage.getItem('driver_name');

  const { data: orders, isLoading } = useDriverOrders(driverId);
  const { newOrderIds, acknowledgeOrder, permissionGranted, requestPermission } = useDriverNotifications(orders);

  // Listen for push notifications from SW to play alarm in foreground
  useServiceWorkerPush();

  useEffect(() => {
    if (!driverId || !driverName) {
      navigate('/driver');
    }
  }, [driverId, driverName, navigate]);

  // Subscribe to realtime changes
  useEffect(() => {
    if (!driverId) return;
    const channel = supabase
      .channel('driver-orders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        // React Query will refetch via refetchInterval
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [driverId]);

  const handleLogout = () => {
    localStorage.removeItem('driver_id');
    localStorage.removeItem('driver_name');
    localStorage.removeItem('driver_seen_order_ids');
    navigate('/driver');
  };

  const readyOrders = orders?.filter((o: any) => o.status === 'ready') || [];
  const deliveryOrders = orders?.filter((o: any) => o.status === 'delivery') || [];

  return (
    <>
      <Helmet>
        <title>{`Entregas - ${store?.name || 'Restaurante'}`}</title>
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-card border-b border-border px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-bold text-foreground">Olá, {driverName}!</h1>
              <p className="text-sm text-muted-foreground">{store?.name}</p>
            </div>
            <div className="flex items-center gap-2">
              <PushNotificationToggle variant="button" userType="driver" userIdentifier={driverId} />
              <Button variant="outline" size="icon" onClick={handleLogout}>
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 p-4">
          <div className="bg-orange-100 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-orange-700">{readyOrders.length}</p>
            <p className="text-xs text-orange-600">Aguardando</p>
          </div>
          <div className="bg-purple-100 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-purple-700">{deliveryOrders.length}</p>
            <p className="text-xs text-purple-600">Em Entrega</p>
          </div>
        </div>

        {/* Orders */}
        <div className="px-4 pb-6 space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (!orders || orders.length === 0) ? (
            <div className="text-center py-16">
              <div className="mx-auto mb-4 h-20 w-20 rounded-full bg-muted flex items-center justify-center">
                <Truck className="h-10 w-10 text-muted-foreground" />
              </div>
              <p className="text-xl text-muted-foreground">Nenhuma entrega no momento</p>
              <p className="text-sm text-muted-foreground mt-2">Quando um pedido for atribuído a você, ele aparecerá aqui</p>
            </div>
          ) : (
            <>
              {deliveryOrders.length > 0 && (
                <div>
                  <h2 className="font-bold text-foreground mb-3 flex items-center gap-2">
                    <Truck className="h-5 w-5 text-purple-600" /> Em Entrega
                  </h2>
                  <div className="space-y-3">
                    {deliveryOrders.map((order: any) => (
                      <DriverOrderCard key={order.id} order={order} isNew={false} onAcknowledge={acknowledgeOrder} />
                    ))}
                  </div>
                </div>
              )}
              {readyOrders.length > 0 && (
                <div>
                  <h2 className="font-bold text-foreground mb-3 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-orange-600" /> Aguardando Retirada
                  </h2>
                  <div className="space-y-3">
                    {readyOrders.map((order: any) => (
                      <DriverOrderCard key={order.id} order={order} isNew={newOrderIds.has(order.id)} onAcknowledge={acknowledgeOrder} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
