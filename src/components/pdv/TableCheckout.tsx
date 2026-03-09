import { useState, useMemo } from 'react';
import { ArrowLeft, Percent, DollarSign, CreditCard, Wallet, Smartphone, Users, Banknote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { TableWithOrder, TableOrderItem } from '@/types/pdv';
import { useOpenTableOrdersByTableId } from '@/hooks/useTableOrdersByTable';
import { useAllTableOrderItems, useCloseAllTableOrders } from '@/hooks/useTableCheckout';
import { CheckoutPrintButton } from './CheckoutPrintButton';
import { cn } from '@/lib/utils';

interface TableCheckoutProps {
  table: TableWithOrder;
  onBack: () => void;
  onSuccess: () => void;
}

const paymentMethods = [
  { id: 'money', label: 'Dinheiro', icon: Wallet },
  { id: 'credit', label: 'Crédito', icon: CreditCard },
  { id: 'debit', label: 'Débito', icon: Banknote },
  { id: 'pix', label: 'PIX', icon: Smartphone },
];

export function TableCheckout({ table, onBack, onSuccess }: TableCheckoutProps) {
  const [discountType, setDiscountType] = useState<'value' | 'percentage'>('value');
  const [discountValue, setDiscountValue] = useState('');
  const [serviceFeeEnabled, setServiceFeeEnabled] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [changeFor, setChangeFor] = useState('');

  // Get all open orders for this table
  const { orders: allOrders, isLoading: isLoadingOrders } = useOpenTableOrdersByTableId(table.id);
  
  // Get all items from all orders
  const orderIds = allOrders.map(o => o.id);
  const { items: allItems, isLoading: isLoadingItems } = useAllTableOrderItems(orderIds);
  
  // Close all orders mutation
  const closeAllOrders = useCloseAllTableOrders();

  // Calculate total customer count from all orders
  const totalCustomerCount = useMemo(() => {
    return allOrders.reduce((sum, order) => sum + (order.customer_count || 1), 0);
  }, [allOrders]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const calculations = useMemo(() => {
    const activeItems = allItems.filter(i => i.status !== 'cancelled');
    const subtotal = activeItems.reduce((sum, item) => sum + (item.quantity * Number(item.unit_price)), 0);

    let discountAmount = 0;
    const discountNum = parseFloat(discountValue) || 0;
    if (discountType === 'percentage') {
      discountAmount = subtotal * (discountNum / 100);
    } else {
      discountAmount = discountNum;
    }

    const afterDiscount = Math.max(0, subtotal - discountAmount);
    const serviceFee = serviceFeeEnabled ? afterDiscount * 0.10 : 0;
    const total = afterDiscount + serviceFee;

    const perPerson = totalCustomerCount > 1 ? total / totalCustomerCount : total;

    const changeForNum = parseFloat(changeFor) || 0;
    const change = paymentMethod === 'money' && changeForNum > total ? changeForNum - total : 0;

    return {
      subtotal,
      discountAmount,
      afterDiscount,
      serviceFee,
      total,
      perPerson,
      itemCount: activeItems.length,
      change,
      orderCount: allOrders.length,
    };
  }, [allItems, discountType, discountValue, serviceFeeEnabled, totalCustomerCount, paymentMethod, changeFor, allOrders.length]);

  const handleClose = async () => {
    if (!paymentMethod || allOrders.length === 0) return;

    await closeAllOrders.mutateAsync({
      orderIds: orderIds,
      tableId: table.id,
      paymentMethod,
      discount: parseFloat(discountValue) || 0,
      discountType,
      serviceFeeEnabled,
      totalAmount: calculations.total,
    });

    onSuccess();
  };

  // Group items by order for display
  const itemsByOrder = useMemo(() => {
    const grouped: Record<number, TableOrderItem[]> = {};
    allItems.filter(i => i.status !== 'cancelled').forEach(item => {
      const orderId = item.table_order_id;
      if (!grouped[orderId]) {
        grouped[orderId] = [];
      }
      grouped[orderId].push(item);
    });
    return grouped;
  }, [allItems]);

  const isLoading = isLoadingOrders || isLoadingItems;

  if (isLoading || allOrders.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">Fechar Mesa {table.number}</h1>
          <p className="text-sm text-muted-foreground">
            {calculations.orderCount} pedido{calculations.orderCount > 1 ? 's' : ''} • {calculations.itemCount} itens
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Left Column - Options */}
        <div className="space-y-4">
          {/* Discount */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Desconto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button
                  variant={discountType === 'value' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDiscountType('value')}
                  className="flex-1"
                >
                  <DollarSign className="h-4 w-4 mr-1" />
                  Valor (R$)
                </Button>
                <Button
                  variant={discountType === 'percentage' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDiscountType('percentage')}
                  className="flex-1"
                >
                  <Percent className="h-4 w-4 mr-1" />
                  Porcentagem (%)
                </Button>
              </div>
              <Input
                type="number"
                min={0}
                step={discountType === 'percentage' ? 1 : 0.01}
                max={discountType === 'percentage' ? 100 : undefined}
                placeholder={discountType === 'percentage' ? 'Ex: 10' : 'Ex: 15.00'}
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
              />
            </CardContent>
          </Card>

          {/* Service Fee */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Taxa de Serviço (10%)</Label>
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(calculations.serviceFee)}
                  </p>
                </div>
                <Switch
                  checked={serviceFeeEnabled}
                  onCheckedChange={setServiceFeeEnabled}
                />
              </div>
            </CardContent>
          </Card>

          {/* Payment Method */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Forma de Pagamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                <div className="grid grid-cols-2 gap-2">
                  {paymentMethods.map((method) => (
                    <Label
                      key={method.id}
                      htmlFor={method.id}
                      className={cn(
                        "flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all",
                        paymentMethod === method.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <RadioGroupItem value={method.id} id={method.id} className="sr-only" />
                      <method.icon className={cn(
                        "h-6 w-6",
                        paymentMethod === method.id ? "text-primary" : "text-muted-foreground"
                      )} />
                      <span className="text-sm font-medium">{method.label}</span>
                    </Label>
                  ))}
                </div>
              </RadioGroup>

              {/* Change calculation for cash payments */}
              {paymentMethod === 'money' && (
                <div className="space-y-2 pt-2 border-t">
                  <Label>Troco para (R$)</Label>
                  <Input
                    type="number"
                    min={calculations.total}
                    step={0.01}
                    placeholder={`Mínimo: ${formatCurrency(calculations.total)}`}
                    value={changeFor}
                    onChange={(e) => setChangeFor(e.target.value)}
                  />
                  {calculations.change > 0 && (
                    <p className="text-sm font-medium text-primary">
                      Troco: {formatCurrency(calculations.change)}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Summary */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Resumo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{formatCurrency(calculations.subtotal)}</span>
              </div>

              {calculations.discountAmount > 0 && (
                <div className="flex justify-between text-primary">
                  <span>Desconto</span>
                  <span>-{formatCurrency(calculations.discountAmount)}</span>
                </div>
              )}

              {serviceFeeEnabled && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Taxa de Serviço (10%)</span>
                  <span className="font-medium">{formatCurrency(calculations.serviceFee)}</span>
                </div>
              )}

              <Separator />

              <div className="flex justify-between text-xl font-bold">
                <span>Total</span>
                <span className="text-primary">{formatCurrency(calculations.total)}</span>
              </div>

              {totalCustomerCount > 1 && (
                <div className="bg-muted rounded-xl p-3 text-center">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
                    <Users className="h-4 w-4" />
                    <span className="text-sm">Por pessoa ({totalCustomerCount})</span>
                  </div>
                  <p className="text-lg font-bold">{formatCurrency(calculations.perPerson)}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Items List - Grouped by Order */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Itens ({calculations.itemCount})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {Object.entries(itemsByOrder).map(([orderId, items]) => (
                  <div key={orderId}>
                    {calculations.orderCount > 1 && (
                      <p className="text-xs text-muted-foreground font-medium mb-1">
                        Pedido #{orderId}
                      </p>
                    )}
                    {items.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm py-0.5">
                        <span className="text-muted-foreground">
                          {item.quantity}x {item.product_name}
                        </span>
                        <span className="font-medium">
                          {formatCurrency(item.quantity * Number(item.unit_price))}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Print/PDF Buttons */}
          <CheckoutPrintButton
            tableName={`Mesa ${table.number}`}
            items={allItems}
            subtotal={calculations.subtotal}
            discountAmount={calculations.discountAmount}
            serviceFeeEnabled={serviceFeeEnabled}
            serviceFee={calculations.serviceFee}
            total={calculations.total}
          />

          {/* Close Button */}
          <Button
            className="w-full h-14 text-lg"
            onClick={handleClose}
            disabled={!paymentMethod || closeAllOrders.isPending}
          >
            {closeAllOrders.isPending
              ? 'Finalizando...'
              : `Fechar Mesa - ${formatCurrency(calculations.total)}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
