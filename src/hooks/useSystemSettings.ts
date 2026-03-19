import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SystemSettings {
  id: number;
  stock_enabled: boolean;
  product_stock_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export function useSystemSettings() {
  return useQuery({
    queryKey: ['system-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('id', 1)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error; // Ignora se não encontrar para criar no primeiro uso
      
      if (!data) {
        // Fallback temporário até a row ser criada
        return {
          id: 1,
          stock_enabled: true,
          product_stock_enabled: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as SystemSettings;
      }
      
      return data as SystemSettings;
    },
  });
}

export function useUpdateSystemSettings() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (update: Partial<Omit<SystemSettings, 'id' | 'created_at' | 'updated_at'>>) => {
      const { data, error } = await supabase
        .from('system_settings')
        .update(update)
        .eq('id', 1)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
    },
  });
}
