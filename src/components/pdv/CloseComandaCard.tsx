import { Trash2, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useComandaOrderDetails, Comanda } from '@/hooks/useComandas';
import { useMemo } from 'react';

const formatCurrency = (v: number) => {
  const safe = Number.isFinite(v) ? v : 0;
  return safe.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

interface CloseComandaCardProps {
  comanda: Comanda;
  onClose: () => void;
  onTransfer: () => void;
  onDelete: () => void;
  deleteIsPending: boolean;
}

export function CloseComandaCard({ comanda, onClose, onTransfer, onDelete, deleteIsPending }: CloseComandaCardProps) {
  const { data: orders = [], isLoading } = useComandaOrderDetails(comanda.id);

  const total = useMemo(() => {
    let sum = 0;
    orders.forEach(order => {
      (order.items || []).forEach((item: any) => {
        sum += (Number(item.unit_price) || 0) * (item.quantity || 0);
      });
    });
    return sum;
  }, [orders]);

  return (
    <Card
      className="relative cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all active:scale-[0.97]"
      onClick={onClose}
    >
      <CardContent className="p-4 text-center">
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
        <Button
          variant="ghost"
          size="icon-sm"
          className="absolute top-1 left-1 h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10 z-10"
          onClick={(e) => { e.stopPropagation(); onTransfer(); }}
          title="Transferir pedidos"
        >
          <ArrowRight className="h-3 w-3" />
        </Button>
        <Lock className="h-8 w-8 mx-auto mb-2 text-destructive" />
        <p className="font-bold text-lg">Comanda #{comanda.numero_comanda}</p>
        <Badge variant="destructive" className="mt-1">Ocupada</Badge>
        <div className="mt-2 pt-2 border-t border-border">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
          ) : (
            <p className="font-bold text-primary text-lg">{formatCurrency(total)}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
