import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface DineInOrderData {
  tableId: string;
  existingOrderId?: number | null;
  items: {
    productId?: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    observation?: string | null;
  }[];
}

// Helper to check if existing order has items in preparation
async function hasItemsInPreparation(orderId: number): Promise<boolean> {
  const { data, error } = await supabase
    .from('table_order_items')
    .select('id')
    .eq('table_order_id', orderId)
    .in('status', ['preparing', 'ready']);

  if (error) throw error;
  return (data?.length || 0) > 0;
}

// Helper to update order totals after adding items
async function updateOrderTotals(orderId: number) {
  const { data: items, error: itemsError } = await supabase
    .from('table_order_items')
    .select('quantity, unit_price')
    .eq('table_order_id', orderId)
    .neq('status', 'cancelled');

  if (itemsError) throw itemsError;

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

  const { error: updateError } = await supabase
    .from('table_orders')
    .update({ subtotal, total_amount: subtotal })
    .eq('id', orderId);

  if (updateError) throw updateError;
}


export function useCreateDineInOrder() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: DineInOrderData) => {
      let targetOrderId: number | null = null;
      let createdNewOrder = false;

      // Check if there's an existing open order for this table that we can add to
      if (data.existingOrderId) {
        const shouldSplit = await hasItemsInPreparation(data.existingOrderId);
        if (!shouldSplit) {
          // Add items to existing order
          targetOrderId = data.existingOrderId;
        }
      }

      // If no existing order or we need to split, check for any open order on this table
      if (!targetOrderId) {
        const { data: existingOrders, error: existingError } = await supabase
          .from('table_orders')
          .select('id')
          .eq('table_id', data.tableId)
          .in('status', ['open', 'requesting_bill'])
          .order('opened_at', { ascending: false })
          .limit(1);

        if (existingError) throw existingError;

        if (existingOrders && existingOrders.length > 0) {
          const existingOrderId = existingOrders[0].id;
          const shouldSplit = await hasItemsInPreparation(existingOrderId);
          if (!shouldSplit) {
            targetOrderId = existingOrderId;
          }
        }
      }

      // Create new order if needed
      if (!targetOrderId) {
        const { data: order, error: orderError } = await supabase
          .from('table_orders')
          .insert({
            table_id: data.tableId,
            customer_count: 1,
            status: 'open',
            subtotal: 0,
            discount: 0,
            discount_type: 'value',
            service_fee_enabled: false,
            service_fee_percentage: 0,
            total_amount: 0,
          })
          .select()
          .single();

        if (orderError) throw orderError;
        targetOrderId = order.id;
        createdNewOrder = true;
      }

      // Add items to the order
      const itemsToInsert = data.items.map((item) => ({
        table_order_id: targetOrderId,
        product_id: item.productId || null,
        product_name: item.productName,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        observation: item.observation || null,
        status: 'pending',
      }));

      const { error: itemsError } = await supabase
        .from('table_order_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      // Update totals
      await updateOrderTotals(targetOrderId);

      // Update table status only if we created a new order
      if (createdNewOrder) {
        const { error: tableError } = await supabase
          .from('tables')
          .update({
            status: 'occupied',
            current_order_id: targetOrderId,
          })
          .eq('id', data.tableId);

        if (tableError) throw tableError;
      }

      return { id: targetOrderId, createdNewOrder };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['tables-with-orders'] });
      queryClient.invalidateQueries({ queryKey: ['tables-for-dine-in'] });
      queryClient.invalidateQueries({ queryKey: ['available-tables-public'] });
      queryClient.invalidateQueries({ queryKey: ['kitchen-items'] });
      queryClient.invalidateQueries({ queryKey: ['all-orders'] });
      queryClient.invalidateQueries({ queryKey: ['table-orders-by-table'] });
      queryClient.invalidateQueries({ queryKey: ['table-order-items'] });
      toast({
        title: '🎉 Pedido enviado!',
        description: result.createdNewOrder
          ? 'Seu pedido foi recebido e está sendo preparado.'
          : 'Itens adicionados ao pedido da mesa.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao enviar pedido',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
