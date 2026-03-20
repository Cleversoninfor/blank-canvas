import { useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Trash2, Loader2, ShoppingBag } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useComandaOrderDetails, Comanda } from '@/hooks/useComandas';
import { useMemo } from 'react';

const formatCurrency = (v: number) => {
  const safe = Number.isFinite(v) ? v : 0;
  return safe.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};


interface ComandaConsumoCardProps {
  comanda: Comanda;
  onAddMore: (comanda: Comanda) => void;
}

export function ComandaConsumoCard({ comanda, onAddMore }: ComandaConsumoCardProps) {
  const [expanded, setExpanded] = useState(false);
  
  // Fetch for comandas
  const { data: comandaOrdersData, isLoading } = useComandaOrderDetails(comanda.id);

  const allItems = useMemo(() => {
    const itemMap = new Map<string, { product_name: string; quantity: number; unit_price: number; observation?: string }>();
    
    // Comanda orders are grouped
    const orders = Array.isArray(comandaOrdersData) ? comandaOrdersData : [];
    orders.forEach(order => {
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
  }, [comandaOrdersData]);

  const total = allItems.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);

  return (
    <Card className="admin-card border-none shadow-lg overflow-hidden transition-all duration-300">
      <CardContent className="p-0">
        <button
          className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors text-left"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-3">
            <ShoppingBag className="h-5 w-5 text-primary" />
          <span className="font-bold text-foreground">
            Comanda #{comanda.numero_comanda}
          </span>
          <Badge variant="destructive" className="text-xs">Ocupada</Badge>
          </div>
          <div className="flex items-center gap-3">
            {!isLoading && allItems.length > 0 && (
              <span className="text-sm font-semibold text-primary">{formatCurrency(total)}</span>
            )}
            {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </div>
        </button>

        {expanded && (
          <div className="border-t border-border px-4 pb-4 space-y-3">
            {isLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : allItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum item nesta comanda.</p>
            ) : (
              <div className="space-y-2 pt-3">
                {allItems.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <span className="font-medium text-foreground">{item.product_name}</span>
                        <span className="text-muted-foreground ml-2">x{item.quantity}</span>
                      </div>
                      {item.observation && (
                        <p className="text-[11px] text-muted-foreground italic leading-tight mt-0.5">{item.observation}</p>
                      )}
                    </div>
                    <span className="font-semibold text-primary">{formatCurrency(item.unit_price * item.quantity)}</span>
                  </div>
                ))}
                <div className="bg-muted/50 rounded-lg p-3 flex justify-between items-center mt-2">
                  <span className="font-bold text-foreground">Total</span>
                  <span className="font-bold text-lg text-primary">{formatCurrency(total)}</span>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="w-full" onClick={() => onAddMore(comanda)}>
                <Plus className="h-4 w-4 mr-2" /> Produtos
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
