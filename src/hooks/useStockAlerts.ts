import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

export function useStockAlerts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('stock-alerts-channel')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ingredients',
        },
        (payload) => {
          const oldRow = payload.old as Record<string, any>;
          const newRow = payload.new as Record<string, any>;
          
          if (newRow.stock_quantity < oldRow.stock_quantity && newRow.stock_quantity <= newRow.min_stock) {
            toast({
              title: '⚠️ Estoque no mínimo',
              description: `O ingrediente ${newRow.name} atingiu o estoque mínimo. Quantidade atual: ${newRow.stock_quantity} ${newRow.unit || ''}`,
              variant: 'destructive',
              duration: 10000,
            });
            queryClient.invalidateQueries({ queryKey: ['ingredients'] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast, queryClient]);
}
