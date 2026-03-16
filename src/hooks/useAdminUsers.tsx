import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AdminUser {
  id: string;
  usuario: string;
  acesso_operacoes: boolean;
  acesso_gestao: boolean;
  acesso_sistema: boolean;
  created_at: string;
}

export function useAdminUsers() {
  return useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_users')
        .select('id, usuario, acesso_operacoes, acesso_gestao, acesso_sistema, created_at')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as AdminUser[];
    },
  });
}

export function useCreateAdminUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      usuario: string;
      senha: string;
      acesso_operacoes: boolean;
      acesso_gestao: boolean;
      acesso_sistema: boolean;
    }) => {
      const { data, error } = await supabase
        .from('admin_users')
        .insert({
          usuario: params.usuario,
          senha: params.senha,
          acesso_operacoes: params.acesso_operacoes,
          acesso_gestao: params.acesso_gestao,
          acesso_sistema: params.acesso_sistema,
        })
        .select('id, usuario, acesso_operacoes, acesso_gestao, acesso_sistema, created_at')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });
}

export function useUpdateAdminUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      id: string;
      usuario?: string;
      senha?: string;
      acesso_operacoes?: boolean;
      acesso_gestao?: boolean;
      acesso_sistema?: boolean;
    }) => {
      const { id, ...update } = params;
      // Remove undefined values
      const cleanUpdate = Object.fromEntries(
        Object.entries(update).filter(([_, v]) => v !== undefined)
      );
      const { error } = await supabase
        .from('admin_users')
        .update(cleanUpdate)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });
}

export function useDeleteAdminUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('admin_users')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });
}
