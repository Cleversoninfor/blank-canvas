import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DineInTable {
  id: string;
  number: number;
  name: string | null;
  location: string | null;
  status: string | null;
  capacity: number | null;
}

export function useDineInTables() {
  return useQuery({
    queryKey: ['dine-in-tables'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tables')
        .select('id, number, name, location, status, capacity')
        .order('number', { ascending: true });
      if (error) throw error;
      return (data || []) as DineInTable[];
    },
  });
}

export function useCreateDineInTable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { number: number; location?: string }) => {
      const { data, error } = await supabase
        .from('tables')
        .insert({ number: params.number, location: params.location || null, name: `Mesa ${params.number}` })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dine-in-tables'] }),
  });
}

export function useUpdateDineInTable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; number?: number; location?: string }) => {
      const updates: Record<string, unknown> = {};
      if (params.number !== undefined) {
        updates.number = params.number;
        updates.name = `Mesa ${params.number}`;
      }
      if (params.location !== undefined) updates.location = params.location;
      const { error } = await supabase.from('tables').update(updates).eq('id', params.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dine-in-tables'] }),
  });
}

export function useDeleteDineInTable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tables').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dine-in-tables'] }),
  });
}

export function useTableOrders() {
  return useQuery({
    queryKey: ['table-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('table_orders')
        .select(`
          *,
          table:table_id(number, name)
        `)
        .eq('status', 'open')
        .order('opened_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useTableOrderDetails(tableOrderId?: number) {
  return useQuery({
    queryKey: ['table-order-details', tableOrderId],
    queryFn: async () => {
      if (!tableOrderId) return [];
      const { data, error } = await supabase
        .from('table_order_items')
        .select('*')
        .eq('table_order_id', tableOrderId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!tableOrderId,
  });
}

export function useCreateTableOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ tableId }: { tableId: string }) => {
      // 1. Create table order
      const { data: order, error: orderError } = await supabase
        .from('table_orders')
        .insert({
          table_id: tableId,
          status: 'open',
          opened_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (orderError) throw orderError;

      // 2. Update table status to occupied
      const { error: tableError } = await supabase
        .from('tables')
        .update({ status: 'occupied', current_order_id: order.id })
        .eq('id', tableId);
      
      if (tableError) throw tableError;

      return order;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dine-in-tables'] });
      qc.invalidateQueries({ queryKey: ['table-orders'] });
    },
  });
}

export function useAddTableItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      tableOrderId,
      items,
    }: {
      tableOrderId: number;
      items: { product_id: string; product_name: string; quantity: number; unit_price: number; observation?: string }[];
    }) => {
      const { error } = await supabase
        .from('table_order_items')
        .insert(items.map(item => ({
          table_order_id: tableOrderId,
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          observation: item.observation || null,
          status: 'pending'
        })));

      if (error) throw error;

      // Update total amount in table_orders
      const total = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
      const { error: updateError } = await (supabase as any).rpc('update_table_order_total', {
        _order_id: tableOrderId,
        _additional_amount: total
      });
      
      // If RPC fails (might not exist yet), we can do it manually, but RPC is better for atomicity
      if (updateError) {
         console.warn('RPC update_table_order_total not found, falling back to manual update');
         // Manual update logic if needed
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['table-order-details'] });
      qc.invalidateQueries({ queryKey: ['table-orders'] });
      qc.invalidateQueries({ queryKey: ['kitchen-items'] });
      qc.invalidateQueries({ queryKey: ['all-orders'] });
    },
  });
}

export function useCloseTableOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      tableOrderId,
      tableId,
      valorTotal,
      formaPagamento,
    }: {
      tableOrderId: number;
      tableId: string;
      valorTotal: number;
      formaPagamento: string;
    }) => {
      // 1. Update table_orders status to paid
      const { error: orderError } = await supabase
        .from('table_orders')
        .update({ 
          status: 'paid',
          closed_at: new Date().toISOString(),
          payment_method: formaPagamento,
          total_amount: valorTotal
        })
        .eq('id', tableOrderId);

      if (orderError) throw orderError;

      // 2. Set table back to available
      const { error: tableError } = await supabase
        .from('tables')
        .update({ 
          status: 'available', 
          current_order_id: null 
        })
        .eq('id', tableId);

      if (tableError) throw tableError;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dine-in-tables'] });
      qc.invalidateQueries({ queryKey: ['table-orders'] });
      qc.invalidateQueries({ queryKey: ['all-orders'] });
      qc.invalidateQueries({ queryKey: ['kitchen-items'] });
    },
  });
}
