import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Comanda {
  id: string;
  numero_comanda: number;
  status: string; // 'livre' | 'ocupada'
  created_at: string;
}

export interface ComandaPedido {
  id: string;
  comanda_id: string;
  pedido_id: number;
  created_at: string;
}

export function useComandas() {
  return useQuery({
    queryKey: ['comandas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comandas')
        .select('*')
        .in('status', ['livre', 'ocupada'])
        .order('numero_comanda', { ascending: true });

      if (error) throw error;
      return data as Comanda[];
    },
  });
}

export function useComandaPedidos(comandaId?: string) {
  return useQuery({
    queryKey: ['comanda-pedidos', comandaId],
    queryFn: async () => {
      if (!comandaId) return [];
      const { data, error } = await supabase
        .from('comanda_pedidos')
        .select('*')
        .eq('comanda_id', comandaId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ComandaPedido[];
    },
    enabled: !!comandaId,
  });
}

// Fetch full order details for a comanda's linked orders
export function useComandaOrderDetails(comandaId?: string) {
  return useQuery({
    queryKey: ['comanda-order-details', comandaId],
    queryFn: async () => {
      if (!comandaId) return [];
      
      // 1. Get linked order IDs
      const { data: links, error: linksError } = await supabase
        .from('comanda_pedidos')
        .select('pedido_id')
        .eq('comanda_id', comandaId);
      
      if (linksError) throw linksError;
      if (!links || links.length === 0) return [];
      
      const orderIds = links.map(l => l.pedido_id);
      
      // 2. Get orders and items in parallel for better performance
      const [ordersRes, itemsRes] = await Promise.all([
        supabase
          .from('orders')
          .select('*')
          .in('id', orderIds)
          .order('created_at', { ascending: true }),
        supabase
          .from('order_items')
          .select('*')
          .in('order_id', orderIds)
      ]);
      
      if (ordersRes.error) throw ordersRes.error;
      if (itemsRes.error) throw itemsRes.error;
      
      // 3. Map items to their respective orders
      return (ordersRes.data || []).map(order => ({
        ...order,
        items: (itemsRes.data || []).filter(item => item.order_id === order.id),
      }));
    },
    enabled: !!comandaId,
  });
}

export function useCreateComanda() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (numeroComanda: number) => {
      const { data, error } = await supabase
        .from('comandas')
        .insert({ numero_comanda: numeroComanda, status: 'livre' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comandas'] });
    },
  });
}

export function useDeleteComanda() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: pedidos, error: checkError } = await supabase
        .from('comanda_pedidos')
        .select('id')
        .eq('comanda_id', id)
        .limit(1);

      if (checkError) throw checkError;
      if (pedidos && pedidos.length > 0) {
        throw new Error('Esta comanda possui pedidos vinculados e não pode ser excluída.');
      }

      const { error } = await supabase
        .from('comandas')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comandas'] });
    },
  });
}

export function useUpdateComandaStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('comandas')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comandas'] });
    },
  });
}

export function useCreateComandaOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      comandaId,
      numeroComanda,
      items,
    }: {
      comandaId: string;
      numeroComanda: number;
      items: { product_name: string; quantity: number; unit_price: number; observation?: string }[];
    }) => {
      const totalAmount = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);

      const { data: orderId, error: orderError } = await supabase.rpc('create_order_with_items', {
        _customer_name: `Comanda #${numeroComanda}`,
        _customer_phone: '0000000000',
        _address_street: 'Local',
        _address_number: '0',
        _address_neighborhood: 'Local',
        _total_amount: totalAmount,
        _payment_method: 'money',
        _items: JSON.parse(JSON.stringify(items)),
      });

      if (orderError) throw orderError;
      if (orderId === null || orderId === undefined) throw new Error('Falha ao criar pedido: ID não retornado');

      const { error: linkError } = await supabase
        .from('comanda_pedidos')
        .insert({ comanda_id: comandaId, pedido_id: orderId });

      if (linkError) throw linkError;

      return orderId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comandas'] });
      queryClient.invalidateQueries({ queryKey: ['comanda-pedidos'] });
      queryClient.invalidateQueries({ queryKey: ['comanda-order-details'] });
      queryClient.invalidateQueries({ queryKey: ['all-orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['kitchen-items'] });
    },
  });
}

export function useCloseSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      comandaId,
      valorTotal,
      formaPagamento,
    }: {
      comandaId: string;
      valorTotal: number;
      formaPagamento: string;
    }) => {
      // Register the sale
      const { error: vendaError } = await supabase
        .from('comanda_vendas' as any)
        .insert({
          comanda_id: comandaId,
          valor_total: valorTotal,
          forma_pagamento: formaPagamento,
        });

      if (vendaError) throw vendaError;

      // Unlink all orders from the comanda
      const { error: unlinkError } = await supabase
        .from('comanda_pedidos')
        .delete()
        .eq('comanda_id', comandaId);

      if (unlinkError) throw unlinkError;

      // Set comanda back to livre
      const { error: statusError } = await supabase
        .from('comandas')
        .update({ status: 'livre' })
        .eq('id', comandaId);

      if (statusError) throw statusError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comandas'] });
      queryClient.invalidateQueries({ queryKey: ['comanda-pedidos'] });
      queryClient.invalidateQueries({ queryKey: ['comanda-order-details'] });
      queryClient.invalidateQueries({ queryKey: ['all-orders'] });
    },
  });
}
export function useTransferOrders() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sourceComandaId,
      targetComandaId,
      targetNumeroComanda,
    }: {
      sourceComandaId: string;
      targetComandaId: string;
      targetNumeroComanda: number;
    }) => {
      // 1. Get all linked orders for the source comanda
      const { data: links, error: fetchError } = await supabase
        .from('comanda_pedidos')
        .select('pedido_id')
        .eq('comanda_id', sourceComandaId);

      if (fetchError) throw fetchError;
      
      const pedidoIds = (links || []).map(link => link.pedido_id);

      if (pedidoIds.length > 0) {
        // 2. Update all orders with the new customer_name
        const { error: orderUpdateError } = await supabase
          .from('orders')
          .update({ customer_name: `Comanda #${targetNumeroComanda}` })
          .in('id', pedidoIds);

        if (orderUpdateError) throw orderUpdateError;

        // 3. Move the links from source to target
        const { error: moveLinksError } = await supabase
          .from('comanda_pedidos')
          .update({ comanda_id: targetComandaId })
          .eq('comanda_id', sourceComandaId);

        if (moveLinksError) throw moveLinksError;
      }

      // 4. Update status of both comandas
      // Set target to occupied, source to free
      const [{ error: sourceError }, { error: targetError }] = await Promise.all([
        supabase.from('comandas').update({ status: 'livre' }).eq('id', sourceComandaId),
        supabase.from('comandas').update({ status: 'ocupada' }).eq('id', targetComandaId)
      ]);

      if (sourceError) throw sourceError;
      if (targetError) throw targetError;
    },
    onSuccess: () => {
      // Perform deep invalidation and selective resets
      queryClient.invalidateQueries({ queryKey: ['comandas'] });
      queryClient.resetQueries({ queryKey: ['comanda-pedidos'] });
      queryClient.resetQueries({ queryKey: ['comanda-order-details'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['all-orders'] });
    },
  });
}
