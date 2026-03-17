import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AdminUser {
  id: string;
  usuario: string;
  acesso_operacoes: boolean;
  acesso_gestao: boolean;
  acesso_sistema: boolean;
  created_at: string;
  login_email?: string;
}

async function callManageAdminUser(body: Record<string, unknown>) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Não autenticado');

  const res = await supabase.functions.invoke('manage-admin-user', {
    body,
  });

  if (res.error) {
    throw new Error(res.error.message || 'Erro na operação');
  }

  // Check for application-level error in response
  if (res.data?.error) {
    throw new Error(res.data.error);
  }

  return res.data;
}

export function useAdminUsers() {
  return useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_users')
        .select('id, usuario, acesso_operacoes, acesso_gestao, acesso_sistema, created_at, login_email')
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
      return callManageAdminUser({
        action: 'create',
        ...params,
      });
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
      // If senha is provided, use change_password action
      if (params.senha) {
        return callManageAdminUser({
          action: 'change_password',
          id: params.id,
          senha: params.senha,
        });
      }

      const { id, senha, ...rest } = params;
      return callManageAdminUser({
        action: 'update',
        id,
        ...rest,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });
}

export function useDeleteAdminUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return callManageAdminUser({
        action: 'delete',
        id,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });
}
