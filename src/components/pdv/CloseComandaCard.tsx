import { Trash2, Lock, ArrowRight, Loader2, FileDown, Printer } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useComandaOrderDetails, Comanda } from '@/hooks/useComandas';
import { useMemo } from 'react';
import { useStoreConfig } from '@/hooks/useStore';
import { PrintOrderData, generateOrderPDF, generateThermalPDF } from '@/utils/thermalPrinter';
import { toast } from 'sonner';

const formatCurrency = (v: number) => {
  const safe = Number.isFinite(v) ? v : 0;
  return safe.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

interface CloseComandaCardProps {
  comanda: Comanda;
  onClose: () => void;
  onTransfer: () => void;
  onDelete?: () => void;
  deleteIsPending?: boolean;
}

export function CloseComandaCard({ comanda, onClose, onTransfer, onDelete, deleteIsPending }: CloseComandaCardProps) {
  const { data: ordersData, isLoading } = useComandaOrderDetails(comanda.id);
  const orders = Array.isArray(ordersData) ? ordersData : [];
  const { data: store } = useStoreConfig();

  const total = useMemo(() => {
    let sum = 0;
    orders.forEach(order => {
      (order.items || []).forEach((item: any) => {
        sum += (Number(item.unit_price) || 0) * (item.quantity || 0);
      });
    });
    return sum;
  }, [orders]);

  const getPrintData = (): PrintOrderData | null => {
    if (!orders.length) return null;
    
    const allItems: any[] = [];
    orders.forEach(order => {
      (order.items || []).forEach((item: any) => {
        const existing = allItems.find(i => i.name === item.product_name && i.unitPrice === Number(item.unit_price) && i.observation === item.observation);
        if (existing) {
          existing.quantity += item.quantity;
        } else {
          allItems.push({
            name: item.product_name,
            quantity: item.quantity,
            unitPrice: Number(item.unit_price),
            observation: item.observation || undefined,
          });
        }
      });
    });

    return {
      orderNumber: comanda.numero_comanda,
      orderType: 'table',
      tableName: `Comanda #${comanda.numero_comanda}`,
      storeName: store?.name || 'Estabelecimento',
      items: allItems,
      subtotal: total,
      total: total,
      createdAt: new Date(),
    };
  };

  const handlePrintPDF = (e: React.MouseEvent) => {
    e.stopPropagation();
    const data = getPrintData();
    if (!data) return;
    try {
      generateOrderPDF(data);
      toast.success('PDF exportado com sucesso!');
    } catch (error) {
      toast.error('Erro ao exportar PDF');
    }
  };

  const handlePrintThermal = (e: React.MouseEvent) => {
    e.stopPropagation();
    const data = getPrintData();
    if (!data) return;
    try {
      generateThermalPDF(data);
    } catch (error) {
      toast.error('Erro ao gerar impressão térmica');
    }
  };

  return (
    <Card
      className="admin-card border-none shadow-lg relative cursor-pointer hover:ring-4 hover:ring-primary/20 transition-all active:scale-[0.98] group overflow-hidden"
      onClick={onClose}
    >
      <CardContent className="p-8 text-center">
        {onDelete && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="absolute top-1 right-1 h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 z-10"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            title="Excluir comanda"
            disabled={deleteIsPending}
          >
            {deleteIsPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
          </Button>
        )}
        
        <Lock className="h-8 w-8 mx-auto mb-2 text-destructive" />
        <p className="font-bold text-lg">Comanda #{comanda.numero_comanda}</p>
        <Badge variant="destructive" className="mt-1">Ocupada</Badge>
        
        <div className="mt-4 pt-4 border-t border-border space-y-4">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
          ) : (
            <p className="font-bold text-primary text-xl">{formatCurrency(total)}</p>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="text-[10px] h-8 px-2"
              onClick={handlePrintPDF}
              disabled={isLoading || orders.length === 0}
            >
              <FileDown className="h-3 w-3 mr-1" />
              PDF
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="text-[10px] h-8 px-2"
              onClick={handlePrintThermal}
              disabled={isLoading || orders.length === 0}
            >
              <Printer className="h-3 w-3 mr-1" />
              Térmica
            </Button>
          </div>

          <Button 
            variant="outline" 
            size="sm" 
            className="w-full text-xs h-8"
            onClick={(e) => {
              e.stopPropagation();
              onTransfer();
            }}
          >
            <ArrowRight className="h-3 w-3 mr-2" />
            Transferir Pedidos
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
