import { useState, useEffect } from 'react';
import { ArrowRightLeft, Loader2, FileText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTables } from '@/hooks/useTables';
import { useOpenTableOrdersByTableId } from '@/hooks/useTableOrdersByTable';
import { TableWithOrder } from '@/types/pdv';
import { cn } from '@/lib/utils';

interface TransferTableModalProps {
  currentTable: TableWithOrder;
  orderId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTransfer: (targetTableId: string, orderId: number) => Promise<void>;
  isTransferring: boolean;
}

type Step = 'select-order' | 'select-table';

export function TransferTableModal({ 
  currentTable, 
  orderId,
  open, 
  onOpenChange,
  onTransfer,
  isTransferring
}: TransferTableModalProps) {
  const [selectedOrder, setSelectedOrder] = useState<number | null>(null);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('select-order');
  
  const { tables, isLoading: isLoadingTables } = useTables();
  const { orders: openOrders, isLoading: isLoadingOrders } = useOpenTableOrdersByTableId(currentTable.id);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      // If only one order, skip to table selection
      if (openOrders.length <= 1) {
        setSelectedOrder(orderId);
        setStep('select-table');
      } else {
        setSelectedOrder(null);
        setStep('select-order');
      }
      setSelectedTable(null);
    }
  }, [open, openOrders.length, orderId]);

  // Show all tables except the current one (both available and occupied)
  const transferableTables = tables.filter(
    t => t.id !== currentTable.id && (t.status === 'available' || t.status === 'occupied')
  );

  const handleOrderSelect = (id: number) => {
    setSelectedOrder(id);
    setStep('select-table');
  };

  const handleBackToOrders = () => {
    setStep('select-order');
    setSelectedTable(null);
  };

  const handleTransfer = async () => {
    if (!selectedTable || !selectedOrder) return;
    await onTransfer(selectedTable, selectedOrder);
    setSelectedOrder(null);
    setSelectedTable(null);
    onOpenChange(false);
  };

  const isLoading = isLoadingTables || isLoadingOrders;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Transferir Mesa {currentTable.number}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : step === 'select-order' && openOrders.length > 1 ? (
          <>
            <p className="text-sm text-muted-foreground">
              Selecione o pedido que deseja transferir:
            </p>
            <ScrollArea className="max-h-60">
              <div className="space-y-2">
                {openOrders.map((order) => (
                  <button
                    key={order.id}
                    onClick={() => handleOrderSelect(order.id)}
                    className={cn(
                      "w-full p-4 rounded-xl border-2 transition-all text-left flex items-center gap-3",
                      selectedOrder === order.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50 bg-muted/50"
                    )}
                  >
                    <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold">Pedido #{order.id}</p>
                      <p className="text-xs text-muted-foreground">
                        {order.waiter_name ? `Atendente: ${order.waiter_name}` : 'Sem atendente'}
                        {order.customer_count > 1 && ` • ${order.customer_count} pessoas`}
                      </p>
                      {order.customer_names && order.customer_names.length > 0 && (
                        <p className="text-xs text-primary mt-0.5">
                          {order.customer_names.join(', ')}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-primary">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(Number(order.subtotal) || 0)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </>
        ) : transferableTables.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Não há mesas disponíveis para transferência.</p>
            <p className="text-sm mt-1">Crie uma nova mesa primeiro.</p>
          </div>
        ) : (
          <>
            {openOrders.length > 1 && (
              <div className="flex items-center gap-2 mb-2">
                <Button variant="ghost" size="sm" onClick={handleBackToOrders}>
                  ← Voltar
                </Button>
                <span className="text-sm text-muted-foreground">
                  Transferindo Pedido #{selectedOrder}
                </span>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              Selecione a mesa de destino:
            </p>
            <ScrollArea className="max-h-60">
              <div className="grid grid-cols-3 gap-2">
                {transferableTables.map((table) => (
                  <button
                    key={table.id}
                    onClick={() => setSelectedTable(table.id)}
                    className={cn(
                      "p-4 rounded-xl border-2 transition-all text-center",
                      selectedTable === table.id
                        ? "border-primary bg-primary/10"
                        : table.status === 'occupied'
                          ? "border-destructive/30 hover:border-primary/50 bg-destructive/10"
                          : "border-border hover:border-primary/50 bg-secondary/50"
                    )}
                  >
                    <p className="font-bold text-lg">Mesa {table.number}</p>
                    {table.name && (
                      <p className="text-xs text-muted-foreground">{table.name}</p>
                    )}
                    <p className={cn(
                      "text-xs mt-1",
                      table.status === 'occupied' ? "text-destructive" : "text-primary"
                    )}>
                      {table.status === 'occupied' ? 'Ocupada' : 'Livre'}
                    </p>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          {step === 'select-table' && (
            <Button 
              onClick={handleTransfer} 
              disabled={!selectedTable || isTransferring}
            >
              {isTransferring ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Transferindo...
                </>
              ) : (
                <>
                  <ArrowRightLeft className="h-4 w-4 mr-2" />
                  Transferir
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
