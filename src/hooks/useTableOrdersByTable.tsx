import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TableOrder } from '@/types/pdv';

/**
 * Lista as comandas abertas de uma mesa (inclui múltiplas “rodadas” separadas).
 * Usado no PDV/Garçom para permitir alternar entre pedidos anteriores e o atual.
 */
export function useOpenTableOrdersByTableId(tableId: string | null | undefined) {
  const { data: orders = [], isLoading, error } = useQuery({
    queryKey: ['table-orders-by-table', tableId],
    queryFn: async () => {
      if (!tableId) return [];

      const { data, error } = await supabase
        .from('table_orders')
        .select('*')
        .eq('table_id', tableId)
        .in('status', ['open', 'requesting_bill'])
        .order('opened_at', { ascending: false });

      if (error) throw error;
      return (data ?? []) as TableOrder[];
    },
    enabled: !!tableId,
  });

  return { orders, isLoading, error };
}
