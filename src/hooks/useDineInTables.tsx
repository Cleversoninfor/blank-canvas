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
