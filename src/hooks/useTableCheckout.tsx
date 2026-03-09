import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { TableOrderItem } from '@/types/pdv';

/**
 * Fetch all items from multiple orders at once
 */
export function useAllTableOrderItems(orderIds: number[]) {
  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['all-table-order-items', orderIds],
    queryFn: async () => {
      if (!orderIds.length) return [];

      const { data, error } = await supabase
        .from('table_order_items')
        .select('*')
        .in('table_order_id', orderIds)
        .order('ordered_at', { ascending: true });

      if (error) throw error;
      return data as TableOrderItem[];
    },
    enabled: orderIds.length > 0,
  });

  return { items, isLoading, error };
}

/**
 * Mutation to close all orders for a table at once
 */
export function useCloseAllTableOrders() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      orderIds: number[];
      tableId: string;
      paymentMethod: string;
      discount?: number;
      discountType?: 'value' | 'percentage';
      serviceFeeEnabled?: boolean;
      totalAmount?: number;
    }) => {
      // Close all orders for this table
      for (const orderId of data.orderIds) {
        const { error: orderError } = await supabase
          .from('table_orders')
          .update({
            status: 'paid',
            payment_method: data.paymentMethod,
            discount: data.discount || 0,
            discount_type: data.discountType || 'value',
            service_fee_enabled: data.serviceFeeEnabled ?? true,
            // Distribute the total proportionally or just set on each
            total_amount: data.totalAmount,
            closed_at: new Date().toISOString(),
          })
          .eq('id', orderId);

        if (orderError) throw orderError;
      }

      // Free the table
      const { error: tableError } = await supabase
        .from('tables')
        .update({
          status: 'available',
          current_order_id: null,
        })
        .eq('id', data.tableId);

      if (tableError) throw tableError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['tables-with-orders'] });
      queryClient.invalidateQueries({ queryKey: ['table-orders-by-table'] });
      queryClient.invalidateQueries({ queryKey: ['all-table-order-items'] });
      queryClient.invalidateQueries({ queryKey: ['closed-table-orders'] });
      toast({ title: 'Mesa fechada com sucesso!' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao fechar mesa',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
