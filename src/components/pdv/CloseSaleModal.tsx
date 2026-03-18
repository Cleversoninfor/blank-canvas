import { useState, useMemo } from 'react';
import { X, CreditCard, Banknote, Smartphone, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useComandaOrderDetails, useCloseSale, Comanda } from '@/hooks/useComandas';
import { useToast } from '@/hooks/use-toast';
import { useOpenedSession, useAddMovimentacao } from '@/hooks/useCaixa';

interface CloseSaleModalProps {
  comanda: Comanda;
  open: boolean;
  onClose: () => void;
}

type PaymentMethod = 'money' | 'pix' | 'debit' | 'credit';

const paymentOptions: { value: PaymentMethod; label: string; icon: React.ReactNode }[] = [
  { value: 'money', label: 'Dinheiro', icon: <Banknote className="h-5 w-5" /> },
  { value: 'pix', label: 'Pix', icon: <Smartphone className="h-5 w-5" /> },
  { value: 'debit', label: 'Débito', icon: <CreditCard className="h-5 w-5" /> },
  { value: 'credit', label: 'Crédito', icon: <CreditCard className="h-5 w-5" /> },
];

const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function CloseSaleModal({ comanda, open, onClose }: CloseSaleModalProps) {
  const { toast } = useToast();
  const { data: ordersData, isLoading } = useComandaOrderDetails(comanda?.id);
  const orders = Array.isArray(ordersData) ? ordersData : [];
  const closeSale = useCloseSale();
  const { data: activeSession } = useOpenedSession();
  const addMovimentacao = useAddMovimentacao();

  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod | null>(null);
  const [valorRecebido, setValorRecebido] = useState('');

  // Flatten all items from all orders
  const allItems = useMemo(() => {
    const itemMap = new Map<string, { product_name: string; quantity: number; unit_price: number; observation?: string }>();
    
    orders.forEach(order => {
      if (!order) return;
      (order.items || []).forEach((item: any) => {
        const name = (item.product_name || '').trim();
        const price = Number(item.unit_price) || 0;
        const observation = (item.observation || '').trim();
        const key = `${name}-${price}-${observation}`;
        const existing = itemMap.get(key);
        if (existing) {
          existing.quantity += item.quantity;
        } else {
          itemMap.set(key, {
            product_name: name,
            quantity: item.quantity,
            unit_price: price,
            observation: observation,
          });
        }
      });
    });
    
    return Array.from(itemMap.values());
  }, [orders]);

  const total = allItems.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  const valorRecebidoNum = parseFloat(valorRecebido) || 0;
  const troco = selectedPayment === 'money' ? Math.max(0, valorRecebidoNum - total) : 0;

  const canConfirm = selectedPayment && (selectedPayment !== 'money' || valorRecebidoNum >= total);

  const handleConfirm = async () => {
    if (!selectedPayment) return;

    try {
      await closeSale.mutateAsync({
        comandaId: comanda.id,
        valorTotal: total,
        formaPagamento: selectedPayment,
      });

      // Se for dinheiro e tiver um caixa aberto, registra a entrada
      if (selectedPayment === 'money' && activeSession) {
        await addMovimentacao.mutateAsync({
          sessionId: activeSession.id,
          type: 'entrada',
          amount: total,
          description: `Venda Comanda #${comanda.numero_comanda}`,
        });
      }

      toast({ title: 'Venda fechada!', description: `Comanda #${comanda.numero_comanda} finalizada com sucesso.` });
      onClose();
    } catch (err: any) {
      toast({ title: 'Erro ao fechar venda', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Fechar Venda - Comanda #{comanda.numero_comanda}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : allItems.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhum item nesta comanda.</p>
        ) : (
          <div className="space-y-4">
            {/* Items list */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase">Itens</h3>
              {allItems.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <span className="font-medium text-foreground">{item.product_name}</span>
                      <span className="text-muted-foreground ml-2">x{item.quantity}</span>
                    </div>
                    {item.observation && (
                      <p className="text-xs text-muted-foreground italic leading-tight mt-0.5">{item.observation}</p>
                    )}
                  </div>
                  <span className="font-medium">{formatCurrency(item.unit_price * item.quantity)}</span>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex justify-between items-center text-lg font-bold">
                <span>Total</span>
                <span className="text-primary">{formatCurrency(total)}</span>
              </div>
            </div>

            {/* Payment selection */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase">Forma de Pagamento</h3>
              <div className="grid grid-cols-2 gap-2">
                {paymentOptions.map(opt => (
                  <Card
                    key={opt.value}
                    className={`cursor-pointer transition-all ${
                      selectedPayment === opt.value
                        ? 'ring-2 ring-primary bg-primary/5'
                        : 'hover:ring-1 hover:ring-primary/30'
                    }`}
                    onClick={() => {
                      setSelectedPayment(opt.value);
                      if (opt.value !== 'money') setValorRecebido('');
                    }}
                  >
                    <CardContent className="p-3 flex items-center gap-2 justify-center">
                      {opt.icon}
                      <span className="font-medium text-sm">{opt.label}</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Cash change calculation */}
            {selectedPayment === 'money' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Valor Recebido</label>
                <Input
                  type="number"
                  placeholder="0,00"
                  value={valorRecebido}
                  onChange={e => setValorRecebido(e.target.value)}
                  min={0}
                  step="0.01"
                />
                {valorRecebidoNum > 0 && valorRecebidoNum >= total && (
                  <div className="bg-accent/20 rounded-lg p-3 flex justify-between items-center">
                    <span className="font-medium">Troco</span>
                    <span className="font-bold text-lg text-primary">{formatCurrency(troco)}</span>
                  </div>
                )}
                {valorRecebidoNum > 0 && valorRecebidoNum < total && (
                  <p className="text-sm text-destructive">Valor insuficiente</p>
                )}
              </div>
            )}

            {/* Confirm button */}
            <Button
              className="w-full"
              size="lg"
              disabled={!canConfirm || closeSale.isPending}
              onClick={handleConfirm}
            >
              {closeSale.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Confirmar Pagamento
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
