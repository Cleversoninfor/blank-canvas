import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, Loader2, RefreshCw, UtensilsCrossed } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStoreConfig } from '@/hooks/useStore';
import { supabase } from '@/integrations/supabase/client';
import { DineInStatusTracker } from '@/components/order/DineInStatusTracker';

interface TableOrder {
  id: number;
  table_id: string | null;
  status: string;
  subtotal: number;
  total_amount: number;
  waiter_name: string | null;
  notes: string | null;
  opened_at: string;
  table?: {
    id: string;
    number: number;
    name: string | null;
  };
  items?: {
    id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    observation: string | null;
    status: string;
  }[];
}

const DineInOrderStatus = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { data: store } = useStoreConfig();

  const { data: order, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['dine-in-order-status', orderId],
    queryFn: async () => {
      if (!orderId) throw new Error('Order ID not provided');

      const { data, error } = await supabase
        .from('table_orders')
        .select(`
          *,
          table:tables!table_orders_table_id_fkey(id, number, name),
          items:table_order_items(*)
        `)
        .eq('id', parseInt(orderId))
        .single();

      if (error) throw error;
      return data as unknown as TableOrder;
    },
    enabled: !!orderId,
    refetchInterval: 10000, // Auto-refresh every 10 seconds
  });

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="text-6xl mb-4">🔍</div>
        <h1 className="text-xl font-bold text-foreground">Pedido não encontrado</h1>
        <p className="text-muted-foreground mt-2">O pedido #{orderId} não foi localizado</p>
        <Button onClick={() => navigate('/')} className="mt-6 rounded-full">
          Voltar ao Cardápio
        </Button>
      </div>
    );
  }

  const getItemStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return { label: 'Pendente', color: 'bg-yellow-500' };
      case 'preparing':
        return { label: 'Preparando', color: 'bg-blue-500' };
      case 'ready':
        return { label: 'Pronto', color: 'bg-green-500' };
      case 'delivered':
        return { label: 'Entregue', color: 'bg-primary' };
      case 'cancelled':
        return { label: 'Cancelado', color: 'bg-destructive' };
      default:
        return { label: status, color: 'bg-muted' };
    }
  };

  return (
    <>
      <Helmet>
        <title>Pedido #{orderId} - {store?.name || 'Restaurante'}</title>
      </Helmet>

      <div className="min-h-screen bg-background pb-24">
        {/* Header */}
        <header className="sticky top-0 z-40 flex items-center justify-between bg-background px-4 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold text-foreground">Pedido #{orderId}</h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={`h-5 w-5 ${isRefetching ? 'animate-spin' : ''}`} />
          </Button>
        </header>

        <div className="p-4 space-y-6">
          {/* Table Info */}
          {order.table && (
            <div className="bg-card rounded-2xl p-4 shadow-card flex items-center gap-4">
              <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center">
                <span className="text-2xl font-bold text-primary-foreground">
                  {order.table.number}
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <UtensilsCrossed className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-foreground">
                    Mesa {order.table.number}
                  </span>
                </div>
                {order.table.name && (
                  <p className="text-sm text-muted-foreground">{order.table.name}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Aberto às {formatTime(order.opened_at)}
                </p>
              </div>
            </div>
          )}

          {/* Status Tracker */}
          <div className="bg-card rounded-2xl p-4 shadow-card">
            <h3 className="font-semibold text-foreground mb-4">Status do Pedido</h3>
            <DineInStatusTracker status={order.status || 'open'} />
          </div>

          {/* Order Items */}
          <div className="bg-card rounded-2xl p-4 shadow-card">
            <h3 className="font-semibold text-foreground mb-4">Itens do Pedido</h3>
            <div className="space-y-3">
              {order.items?.map((item) => {
                const statusInfo = getItemStatusLabel(item.status || 'pending');
                return (
                  <div key={item.id} className="flex items-start justify-between p-3 bg-muted/50 rounded-xl">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">
                          {item.quantity}x {item.product_name}
                        </span>
                      </div>
                      {item.observation && (
                        <p className="text-xs text-muted-foreground mt-1">📝 {item.observation}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`h-2 w-2 rounded-full ${statusInfo.color}`} />
                        <span className="text-xs text-muted-foreground">{statusInfo.label}</span>
                      </div>
                    </div>
                    <span className="font-medium text-foreground">
                      {formatCurrency(item.unit_price * item.quantity)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Total */}
          <div className="bg-card rounded-2xl p-4 shadow-card">
            <div className="flex justify-between items-center">
              <span className="font-bold text-lg text-foreground">Total</span>
              <span className="font-bold text-lg text-primary">
                {formatCurrency(order.total_amount || 0)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              * O pagamento será realizado na mesa ao final do consumo
            </p>
          </div>

          {/* Info */}
          <div className="bg-primary/10 border border-primary/30 rounded-xl p-4">
            <p className="text-sm text-foreground">
              🔄 Esta página atualiza automaticamente a cada 10 segundos
            </p>
          </div>
        </div>

        {/* Bottom Action */}
        <div className="fixed bottom-0 left-0 right-0 bg-background p-4 pb-6 border-t border-border">
          <Button
            onClick={() => navigate('/')}
            size="lg"
            variant="outline"
            className="w-full rounded-full"
          >
            Voltar ao Cardápio
          </Button>
        </div>
      </div>
    </>
  );
};

export default DineInOrderStatus;
