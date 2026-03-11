import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Comanda {
  id: string;
  numero_comanda: number;
  status: string;
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
        .eq('status', 'active')
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

export function useCreateComanda() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (numeroComanda: number) => {
      const { data, error } = await supabase
        .from('comandas')
        .insert({ numero_comanda: numeroComanda })
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
      // Check if comanda has linked orders
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
      // Calculate total
      const totalAmount = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);

      // Create order using the existing orders table
      const { data: orderId, error: orderError } = await supabase.rpc('create_order_with_items', {
        _customer_name: `Comanda #${numeroComanda}`,
        _customer_phone: '0000000000',
        _address_street: 'Local',
        _address_number: '0',
        _address_neighborhood: 'Local',
        _total_amount: totalAmount,
        _payment_method: 'local',
        _items: items as any,
      });

      if (orderError) throw orderError;

      // Link order to comanda
      const { error: linkError } = await supabase
        .from('comanda_pedidos')
        .insert({ comanda_id: comandaId, pedido_id: orderId });

      if (linkError) throw linkError;

      return orderId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comandas'] });
      queryClient.invalidateQueries({ queryKey: ['comanda-pedidos'] });
      queryClient.invalidateQueries({ queryKey: ['all-orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['kitchen-items'] });
    },
  });
}
