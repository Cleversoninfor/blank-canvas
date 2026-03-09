import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { MapPin, Phone, User, CreditCard, Clock, FileDown, Users, Utensils, Printer, Navigation } from 'lucide-react';
import { useUnifiedOrderItems, UnifiedOrder } from '@/hooks/useAllOrders';
import { useStoreConfig } from '@/hooks/useStore';

import { PrintOrderData, generateOrderPDF, generateThermalPDF } from '@/utils/thermalPrinter';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface OrderDetailModalProps {
  order: UnifiedOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
  preparing: { label: 'Em Preparo', color: 'bg-blue-100 text-blue-800' },
  ready: { label: 'Pronto na Cozinha', color: 'bg-orange-100 text-orange-800' },
  delivery: { label: 'Saiu p/ Entrega', color: 'bg-purple-100 text-purple-800' },
  completed: { label: 'Finalizado', color: 'bg-green-100 text-green-800' },
};

const paymentConfig: Record<string, { label: string; icon: string }> = {
  pix: { label: 'PIX', icon: '💠' },
  money: { label: 'Dinheiro', icon: '💵' },
  card: { label: 'Cartão', icon: '💳' },
  credit: { label: 'Cartão de Crédito', icon: '💳' },
  debit: { label: 'Cartão de Débito', icon: '💳' },
};

export function OrderDetailModal({ order, open, onOpenChange }: OrderDetailModalProps) {
  const { data: items } = useUnifiedOrderItems(order?.id ?? 0, order?.type ?? 'delivery');
  const { data: store } = useStoreConfig();

  const formatCurrency = (value: number) =>
    Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const getPrintData = (): PrintOrderData | null => {
    if (!order || !items) return null;
    
    // Determine order type
    let orderType: 'delivery' | 'table' | 'pickup' = 'delivery';
    if (order.type === 'table') {
      orderType = 'table';
    }
    // Note: pickup type would need to be determined from order data if available
    
    return {
      orderNumber: order.id,
      orderType,
      storeName: store?.name || 'Estabelecimento',
      customerName: order.customer_name,
      customerPhone: order.customer_phone || undefined,
      customerCount: order.customer_count || undefined,
      address: order.type === 'delivery' && order.address_street ? {
        street: order.address_street,
        number: order.address_number || '',
        neighborhood: order.address_neighborhood || '',
        complement: order.address_complement || undefined,
        reference: order.address_reference || undefined,
      } : undefined,
      tableName: order.type === 'table' ? order.customer_name : undefined,
      waiterName: order.waiter_name || undefined,
      items: items.map(item => ({
        name: item.product_name,
        quantity: item.quantity,
        unitPrice: Number(item.unit_price),
        observation: item.observation || undefined,
      })),
      subtotal: items.reduce((sum, item) => sum + (item.quantity * Number(item.unit_price)), 0),
      deliveryFee: order.type === 'delivery' ? (store?.delivery_fee || 0) : 0,
      total: Number(order.total_amount),
      paymentMethod: order.payment_method ? (paymentConfig[order.payment_method]?.label || order.payment_method) : undefined,
      changeFor: order.change_for || undefined,
      createdAt: new Date(order.created_at),
    };
  };

  const printData = getPrintData();

  if (!order) return null;

  const status = statusConfig[order.status] || { label: order.status, color: 'bg-gray-100 text-gray-800' };
  const payment = order.payment_method ? (paymentConfig[order.payment_method] || { label: order.payment_method, icon: '💰' }) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">
              {order.type === 'table' ? order.customer_name : `Pedido #${order.id}`}
            </DialogTitle>
            <div className="flex gap-2">
              <Badge variant="outline" className="text-xs">
                {order.type === 'table' ? '🍽️ Mesa' : '🛵 Delivery'}
              </Badge>
              <Badge className={status.color}>{status.label}</Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Order Info */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>
              {format(new Date(order.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </span>
          </div>

          <Separator />

          {/* Customer/Table Info */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground">
              {order.type === 'table' ? 'MESA' : 'CLIENTE'}
            </h3>
            <div className="space-y-2">
              {order.type === 'table' ? (
                <>
                  <div className="flex items-center gap-2">
                    <Utensils className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{order.customer_name}</span>
                  </div>
                  {order.waiter_name && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>Garçom: {order.waiter_name}</span>
                    </div>
                  )}
                  {order.customer_count && (
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{order.customer_count} pessoa(s)</span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{order.customer_name}</span>
                  </div>
                  {order.customer_phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{order.customer_phone}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Delivery Address - Only for delivery orders */}
          {order.type === 'delivery' && order.address_street && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground">ENDEREÇO DE ENTREGA</h3>
                <div className="flex gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">
                      {order.address_street}, {order.address_number}
                    </p>
                    {order.address_complement && (
                      <p className="text-sm text-muted-foreground">{order.address_complement}</p>
                    )}
                    <p className="text-sm text-muted-foreground">{order.address_neighborhood}</p>
                    {order.address_reference && (
                      <p className="text-sm text-muted-foreground italic">
                        Ref: {order.address_reference}
                      </p>
                    )}
                  </div>
                </div>

                {/* Coordinates + Google Maps */}
                {order.latitude && order.longitude && (
                  <div className="space-y-2 mt-2">
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>Lat: {order.latitude.toFixed(6)}</span>
                      <span>Lng: {order.longitude.toFixed(6)}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-2"
                      onClick={() => {
                        const lat = Number(order.latitude);
                        const lng = Number(order.longitude);
                        window.open(
                          `https://www.google.com/maps?q=${lat},${lng}`,
                          '_blank'
                        );
                      }}
                    >
                      <Navigation className="h-4 w-4" />
                      Abrir no Google Maps
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}

          <Separator />

          {/* Order Items */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground">ITENS DO PEDIDO</h3>
            <div className="space-y-2">
              {items?.map((item) => (
                <div key={item.id} className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-medium">
                      {item.quantity}x {item.product_name}
                    </p>
                    {item.observation && (
                      <p className="text-xs text-warning">📝 {item.observation}</p>
                    )}
                  </div>
                  <span className="font-medium">
                    {formatCurrency(item.quantity * Number(item.unit_price))}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Payment Info */}
          {payment && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground">PAGAMENTO</h3>
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span>
                  {payment.icon} {payment.label}
                </span>
                {order.payment_method === 'money' && order.change_for && (
                  <span className="text-muted-foreground">
                    (Troco p/ {formatCurrency(order.change_for)})
                  </span>
                )}
              </div>
            </div>
          )}

          <Separator />

          {/* Total */}
          <div className="bg-muted/50 rounded-xl p-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">Total</span>
              <span className="text-xl font-bold text-primary">
                {formatCurrency(order.total_amount)}
              </span>
            </div>
          </div>

          {/* Print and Export Buttons */}
          {printData && (
            <div className="flex flex-col gap-2">
              <Button
                variant="default"
                className="w-full"
                onClick={() => {
                  try {
                    generateOrderPDF(printData);
                    toast.success('PDF exportado com sucesso!');
                  } catch (error) {
                    toast.error('Erro ao exportar PDF');
                  }
                }}
              >
                <FileDown className="h-4 w-4 mr-2" />
                Exportar PDF
              </Button>
              <Button 
                variant="outline"
                className="w-full"
                onClick={() => {
                  try {
                    generateThermalPDF(printData);
                  } catch (error) {
                    toast.error('Erro ao imprimir');
                  }
                }}
              >
                <Printer className="h-4 w-4 mr-2" />
                Imprimir (Térmica)
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
