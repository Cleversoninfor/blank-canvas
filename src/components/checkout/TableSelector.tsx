import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Users, UtensilsCrossed } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Table {
  id: string;
  number: number;
  name: string | null;
  capacity: number | null;
  status: string | null;
  current_order_id: number | null;
}

interface TableSelectorProps {
  selectedTableId: string | null;
  onTableSelect: (table: Table) => void;
}

export function TableSelector({ selectedTableId, onTableSelect }: TableSelectorProps) {
  const { data: tables = [], isLoading } = useQuery({
    queryKey: ['tables-for-dine-in'],
    queryFn: async () => {
      // Fetch all tables that are either available OR occupied with an open order
      const { data, error } = await supabase
        .from('tables')
        .select('id, number, name, capacity, status, current_order_id')
        .in('status', ['available', 'occupied'])
        .order('number', { ascending: true });

      if (error) throw error;
      return data as Table[];
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (tables.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Nenhuma mesa disponível no momento</p>
        <p className="text-sm text-muted-foreground mt-1">Por favor, aguarde ou procure um atendente</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Selecione sua mesa:</p>
      <div className="grid grid-cols-3 gap-3">
        {tables.map((table) => {
          const isOccupied = table.status === 'occupied';
          
          return (
            <button
              key={table.id}
              onClick={() => onTableSelect(table)}
              className={cn(
                "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all relative",
                selectedTableId === table.id
                  ? "border-primary bg-primary/10 shadow-md"
                  : isOccupied
                    ? "border-orange-400 bg-orange-50 dark:bg-orange-950/20 hover:border-primary/50"
                    : "border-border bg-card hover:border-primary/50"
              )}
            >
              {isOccupied && (
                <div className="absolute -top-2 -right-2 bg-orange-500 text-white rounded-full p-1">
                  <UtensilsCrossed className="h-3 w-3" />
                </div>
              )}
              <span className={cn(
                "text-2xl font-bold",
                selectedTableId === table.id ? "text-primary" : "text-foreground"
              )}>
                {table.number}
              </span>
              {table.name && (
                <span className="text-xs text-muted-foreground mt-0.5 truncate max-w-full">
                  {table.name}
                </span>
              )}
              {isOccupied ? (
                <span className="text-xs text-orange-600 dark:text-orange-400 mt-1 font-medium">
                  Em uso
                </span>
              ) : table.capacity ? (
                <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" />
                  <span>{table.capacity}</span>
                </div>
              ) : null}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground text-center">
        Mesas em uso permitem adicionar mais itens ao pedido existente
      </p>
    </div>
  );
}
