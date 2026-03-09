import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { TableOrder, TableOrderItem, TableOrderStatus, OrderItemStatus } from '@/types/pdv';

// Hook for fetching closed orders (history)
export function useClosedTableOrders(startDate: string, endDate: string) {
  const { data: orders = [], isLoading, error } = useQuery({
    queryKey: ['closed-table-orders', startDate, endDate],
    queryFn: async () => {
      const startDateTime = new Date(startDate);
      startDateTime.setHours(0, 0, 0, 0);
      
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from('table_orders')
        .select('*, items:table_order_items(*)')
        .in('status', ['paid', 'cancelled'])
        .gte('closed_at', startDateTime.toISOString())
        .lte('closed_at', endDateTime.toISOString())
        .order('closed_at', { ascending: false });

      if (error) throw error;
      return data as (TableOrder & { items: TableOrderItem[] })[];
    },
    enabled: !!startDate && !!endDate,
  });

  return { orders, isLoading, error };
}

export function useTableOrder(orderId: number | null) {
  const { data: order, isLoading, error } = useQuery({
    queryKey: ['table-order', orderId],
    queryFn: async () => {
      if (!orderId) return null;
      const { data, error } = await supabase
        .from('table_orders')
        .select('*, customer_names')
        .eq('id', orderId)
        .maybeSingle();
      
      if (error) throw error;
      return data as TableOrder | null;
    },
    enabled: !!orderId,
  });

  const { data: items = [] } = useQuery({
    queryKey: ['table-order-items', orderId],
    queryFn: async () => {
      if (!orderId) return [];
      const { data, error } = await supabase
        .from('table_order_items')
        .select('*')
        .eq('table_order_id', orderId)
        .order('ordered_at', { ascending: true });
      
      if (error) throw error;
      return data as TableOrderItem[];
    },
    enabled: !!orderId,
  });

  return { order, items, isLoading, error };
}

export function useTableOrderMutations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const shouldSplitToNewOrder = async (orderId: number) => {
    // If any item was already accepted by the kitchen (preparing/ready),
    // we start a NEW order so new items don't get mixed with the previous batch.
    const { data: statuses, error } = await supabase
      .from('table_order_items')
      .select('status')
      .eq('table_order_id', orderId)
      .in('status', ['preparing', 'ready']);

    if (error) throw error;
    return (statuses?.length || 0) > 0;
  };

  const openTable = useMutation({
    mutationFn: async (data: { tableId: string; customerCount?: number; waiterName?: string }) => {
      // Create the order
      const { data: order, error: orderError } = await supabase
        .from('table_orders')
        .insert({
          table_id: data.tableId,
          customer_count: data.customerCount || 1,
          waiter_name: data.waiterName || null,
          status: 'open',
          subtotal: 0,
          discount: 0,
          discount_type: 'value',
          service_fee_enabled: true,
          service_fee_percentage: 10,
          total_amount: 0,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Update table
      const { error: tableError } = await supabase
        .from('tables')
        .update({ 
          status: 'occupied', 
          current_order_id: order.id 
        })
        .eq('id', data.tableId);

      if (tableError) throw tableError;

      return order as TableOrder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['tables-with-orders'] });
      // Ensure Admin "Pedidos" updates even if realtime isn't available
      queryClient.invalidateQueries({ queryKey: ['all-orders'] });
      toast({ title: 'Mesa aberta!' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erro ao abrir mesa', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const addItem = useMutation({
    mutationFn: async (data: { 
      orderId: number; 
      productId: string; 
      productName: string; 
      quantity: number; 
      unitPrice: number;
      observation?: string;
    }) => {
      let targetOrderId = data.orderId;
      let createdNewOrder = false;

      // If this order already progressed in the kitchen, create a fresh order for this table
      if (await shouldSplitToNewOrder(data.orderId)) {
        const { data: currentOrder, error: currentOrderError } = await supabase
          .from('table_orders')
          .select('table_id, customer_count, waiter_name, discount, discount_type, service_fee_enabled, service_fee_percentage')
          .eq('id', data.orderId)
          .single();

        if (currentOrderError) throw currentOrderError;

        const { data: newOrder, error: newOrderError } = await supabase
          .from('table_orders')
          .insert({
            table_id: currentOrder.table_id,
            customer_count: currentOrder.customer_count ?? 1,
            waiter_name: currentOrder.waiter_name ?? null,
            status: 'open',
            subtotal: 0,
            discount: currentOrder.discount ?? 0,
            discount_type: currentOrder.discount_type ?? 'value',
            service_fee_enabled: currentOrder.service_fee_enabled ?? true,
            service_fee_percentage: currentOrder.service_fee_percentage ?? 10,
            total_amount: 0,
          })
          .select()
          .single();

        if (newOrderError) throw newOrderError;

        // Point the table to the newest open order
        const { error: tableError } = await supabase
          .from('tables')
          .update({ status: 'occupied', current_order_id: newOrder.id })
          .eq('id', currentOrder.table_id);

        if (tableError) throw tableError;

        targetOrderId = newOrder.id;
        createdNewOrder = true;
      }

      const { data: item, error } = await supabase
        .from('table_order_items')
        .insert({
          table_order_id: targetOrderId,
          product_id: data.productId,
          product_name: data.productName,
          quantity: data.quantity,
          unit_price: data.unitPrice,
          observation: data.observation || null,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      
      // Update order totals
      await updateOrderTotals(targetOrderId);

      return {
        item: item as TableOrderItem,
        orderId: targetOrderId,
        createdNewOrder,
      };
    },
    onSuccess: (result, variables) => {
      const actualOrderId = result.orderId;

      // Refresh both the originally opened order (UI may still be on it) and the actual target order
      queryClient.invalidateQueries({ queryKey: ['table-order-items', variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ['table-order', variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ['table-order-items', actualOrderId] });
      queryClient.invalidateQueries({ queryKey: ['table-order', actualOrderId] });
      queryClient.invalidateQueries({ queryKey: ['tables-with-orders'] });
      queryClient.invalidateQueries({ queryKey: ['kitchen-items'] });
      // Ensure Admin "Pedidos" sees the order as soon as the first item is added
      queryClient.invalidateQueries({ queryKey: ['all-orders'] });
      // Refresh multiple orders list for PDV/Waiter
      queryClient.invalidateQueries({ queryKey: ['table-orders-by-table'] });

      toast({
        title: result.createdNewOrder ? 'Novo pedido criado!' : 'Item adicionado!',
        description: result.createdNewOrder
          ? 'Como o pedido anterior já está em preparo, este item entrou em um novo pedido.'
          : undefined,
      });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erro ao adicionar item', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const updateItemStatus = useMutation({
    mutationFn: async (data: { itemId: string; status: OrderItemStatus; orderId: number }) => {
      const updateData: Record<string, unknown> = { status: data.status };
      if (data.status === 'delivered') {
        updateData.delivered_at = new Date().toISOString();
      }
      
      const { data: item, error } = await supabase
        .from('table_order_items')
        .update(updateData)
        .eq('id', data.itemId)
        .select()
        .single();
      
      if (error) throw error;
      return item as TableOrderItem;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['table-order-items', variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ['kitchen-items'] });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erro ao atualizar item', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const removeItem = useMutation({
    mutationFn: async (data: { itemId: string; orderId: number }) => {
      const { error } = await supabase
        .from('table_order_items')
        .delete()
        .eq('id', data.itemId);
      
      if (error) throw error;
      
      await updateOrderTotals(data.orderId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['table-order-items', variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ['table-order', variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ['tables-with-orders'] });
      queryClient.invalidateQueries({ queryKey: ['kitchen-items'] });
      toast({ title: 'Item removido!' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erro ao remover item', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const requestBill = useMutation({
    mutationFn: async (data: { orderId: number; tableId: string }) => {
      const { error: orderError } = await supabase
        .from('table_orders')
        .update({ status: 'requesting_bill' })
        .eq('id', data.orderId);

      if (orderError) throw orderError;

      const { error: tableError } = await supabase
        .from('tables')
        .update({ status: 'requesting_bill' })
        .eq('id', data.tableId);

      if (tableError) throw tableError;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['table-order', variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['tables-with-orders'] });
      toast({ title: 'Conta solicitada!' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erro ao solicitar conta', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const closeTable = useMutation({
    mutationFn: async (data: { 
      orderId: number; 
      tableId: string; 
      paymentMethod: string;
      discount?: number;
      discountType?: 'value' | 'percentage';
      serviceFeeEnabled?: boolean;
      totalAmount?: number;
    }) => {
      const { error: orderError } = await supabase
        .from('table_orders')
        .update({ 
          status: 'paid',
          payment_method: data.paymentMethod,
          discount: data.discount || 0,
          discount_type: data.discountType || 'value',
          service_fee_enabled: data.serviceFeeEnabled ?? true,
          total_amount: data.totalAmount,
          closed_at: new Date().toISOString(),
        })
        .eq('id', data.orderId);

      if (orderError) throw orderError;

      const { error: tableError } = await supabase
        .from('tables')
        .update({ 
          status: 'available', 
          current_order_id: null 
        })
        .eq('id', data.tableId);

      if (tableError) throw tableError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['tables-with-orders'] });
      toast({ title: 'Mesa fechada com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erro ao fechar mesa', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const cancelOrder = useMutation({
    mutationFn: async (data: { orderId: number; tableId: string }) => {
      const { error: orderError } = await supabase
        .from('table_orders')
        .update({ 
          status: 'cancelled',
          closed_at: new Date().toISOString(),
        })
        .eq('id', data.orderId);

      if (orderError) throw orderError;

      const { error: tableError } = await supabase
        .from('tables')
        .update({ 
          status: 'available', 
          current_order_id: null 
        })
        .eq('id', data.tableId);

      if (tableError) throw tableError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['tables-with-orders'] });
      toast({ title: 'Pedido cancelado!' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erro ao cancelar pedido', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const transferTable = useMutation({
    mutationFn: async (data: { orderId: number; fromTableId: string; toTableId: string }) => {
      // Update order's table_id
      const { error: orderError } = await supabase
        .from('table_orders')
        .update({ table_id: data.toTableId })
        .eq('id', data.orderId);

      if (orderError) throw orderError;

      // Check if there are other open orders remaining on the original table
      const { data: remainingOrders, error: remainingError } = await supabase
        .from('table_orders')
        .select('id')
        .eq('table_id', data.fromTableId)
        .in('status', ['open', 'requesting_bill']);

      if (remainingError) throw remainingError;

      if (remainingOrders && remainingOrders.length > 0) {
        // There are still orders on the original table, update current_order_id to the most recent one
        const { error: fromTableError } = await supabase
          .from('tables')
          .update({ 
            current_order_id: remainingOrders[0].id 
          })
          .eq('id', data.fromTableId);

        if (fromTableError) throw fromTableError;
      } else {
        // No more orders on the original table, free it
        const { error: fromTableError } = await supabase
          .from('tables')
          .update({ 
            status: 'available', 
            current_order_id: null 
          })
          .eq('id', data.fromTableId);

        if (fromTableError) throw fromTableError;
      }

      // Destination table:
      // If it already has a valid open current_order_id, keep it (so the existing "pedido atual" doesn't disappear).
      // Otherwise, set it to a valid open order (fallback to the transferred order).

      const { data: destTable, error: destTableError } = await supabase
        .from('tables')
        .select('current_order_id')
        .eq('id', data.toTableId)
        .maybeSingle();

      if (destTableError) throw destTableError;

      let destCurrentOrderId: number | null = (destTable?.current_order_id ?? null) as number | null;

      if (destCurrentOrderId) {
        const { data: currentIsOpen, error: currentIsOpenError } = await supabase
          .from('table_orders')
          .select('id')
          .eq('id', destCurrentOrderId)
          .in('status', ['open', 'requesting_bill'])
          .maybeSingle();

        if (currentIsOpenError) throw currentIsOpenError;

        // If the pointer is stale (paid/cancelled), we'll recompute below.
        if (!currentIsOpen) destCurrentOrderId = null;
      }

      if (!destCurrentOrderId) {
        const { data: destOpenOrders, error: destOpenOrdersError } = await supabase
          .from('table_orders')
          .select('id, opened_at')
          .eq('table_id', data.toTableId)
          .in('status', ['open', 'requesting_bill'])
          .order('opened_at', { ascending: false });

        if (destOpenOrdersError) throw destOpenOrdersError;

        destCurrentOrderId = destOpenOrders?.[0]?.id ?? data.orderId;
      }

      const { error: toTableError } = await supabase
        .from('tables')
        .update({
          status: 'occupied',
          current_order_id: destCurrentOrderId,
        })
        .eq('id', data.toTableId);

      if (toTableError) throw toTableError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['tables-with-orders'] });
      queryClient.invalidateQueries({ queryKey: ['table-orders-by-table'] });
      toast({ title: 'Mesa transferida com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erro ao transferir mesa', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  return {
    openTable,
    addItem,
    updateItemStatus,
    removeItem,
    requestBill,
    closeTable,
    cancelOrder,
    transferTable,
  };
}

// Helper function to update order totals
async function updateOrderTotals(orderId: number) {
  // Fetch items
  const { data: items, error: itemsError } = await supabase
    .from('table_order_items')
    .select('*')
    .eq('table_order_id', orderId)
    .neq('status', 'cancelled');

  if (itemsError) throw itemsError;

  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  
  // Fetch order for discount and service fee settings
  const { data: order, error: orderError } = await supabase
    .from('table_orders')
    .select('discount, discount_type, service_fee_enabled, service_fee_percentage')
    .eq('id', orderId)
    .single();

  if (orderError) throw orderError;

  let discountAmount = 0;
  if (order.discount_type === 'percentage') {
    discountAmount = subtotal * ((order.discount || 0) / 100);
  } else {
    discountAmount = order.discount || 0;
  }

  const afterDiscount = subtotal - discountAmount;
  const serviceFee = order.service_fee_enabled 
    ? afterDiscount * ((order.service_fee_percentage || 10) / 100)
    : 0;

  const total = afterDiscount + serviceFee;

  // Update order totals
  const { error: updateError } = await supabase
    .from('table_orders')
    .update({ subtotal, total_amount: total })
    .eq('id', orderId);

  if (updateError) throw updateError;
}
