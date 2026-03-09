import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableWithOrder, TableStatus } from '@/types/pdv';

export function useTables() {
  const { data: tables = [], isLoading, error } = useQuery({
    queryKey: ['tables'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tables')
        .select('*')
        .order('number', { ascending: true });
      
      if (error) throw error;
      return data.map(t => ({
        ...t,
        status: t.status as TableStatus,
      })) as Table[];
    },
  });

  return { tables, isLoading, error };
}

export function useTablesWithOrders() {
  const { data: tables = [], isLoading, error } = useQuery({
    queryKey: ['tables-with-orders'],
    queryFn: async () => {
      const { data: tablesData, error: tablesError } = await supabase
        .from('tables')
        .select('*')
        .order('number', { ascending: true });
      
      if (tablesError) throw tablesError;
      
      // Fetch open orders for tables
      const { data: ordersData, error: ordersError } = await supabase
        .from('table_orders')
        .select('*')
        .in('status', ['open', 'requesting_bill']);
      
      if (ordersError) throw ordersError;
      
      return tablesData.map(table => ({
        ...table,
        status: table.status as TableStatus,
        current_order: table.current_order_id 
          ? ordersData?.find(o => o.id === table.current_order_id) || null
          : null,
      })) as TableWithOrder[];
    },
  });

  return { tables, isLoading, error };
}

export function useTableMutations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createTable = useMutation({
    mutationFn: async (data: { number: number; name?: string; capacity?: number }) => {
      const { data: newTable, error } = await supabase
        .from('tables')
        .insert({
          number: data.number,
          name: data.name || null,
          capacity: data.capacity || 4,
          status: 'available',
        })
        .select()
        .single();
      
      if (error) throw error;
      return newTable;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['tables-with-orders'] });
      toast({ title: 'Mesa criada com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erro ao criar mesa', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const updateTable = useMutation({
    mutationFn: async (data: { id: string; number?: number; name?: string; capacity?: number; status?: TableStatus }) => {
      const updateData: Record<string, unknown> = {};
      if (data.number !== undefined) updateData.number = data.number;
      if (data.name !== undefined) updateData.name = data.name;
      if (data.capacity !== undefined) updateData.capacity = data.capacity;
      if (data.status !== undefined) updateData.status = data.status;
      
      const { data: updated, error } = await supabase
        .from('tables')
        .update(updateData)
        .eq('id', data.id)
        .select()
        .single();
      
      if (error) throw error;
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['tables-with-orders'] });
      toast({ title: 'Mesa atualizada!' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erro ao atualizar mesa', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const deleteTable = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tables')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['tables-with-orders'] });
      toast({ title: 'Mesa excluída!' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erro ao excluir mesa', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  return { createTable, updateTable, deleteTable };
}
