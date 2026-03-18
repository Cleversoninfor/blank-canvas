import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const PERM_KEYS = [
  'perm_dashboard',
  'perm_cozinha',
  'perm_entregadores',
  'perm_pdv',
  'perm_pedidos',
  'perm_produtos',
  'perm_categorias',
  'perm_acrescimos',
  'perm_cupons',
  'perm_relatorios',
  'perm_taxas_entrega',
  'perm_horarios',
  'perm_configuracoes',
  'perm_qrcode',
  'perm_usuarios',
  'perm_backup',
] as const;

export type PermKey = typeof PERM_KEYS[number];

export const PERM_LABELS: Record<PermKey, string> = {
  perm_dashboard: 'Dashboard',
  perm_cozinha: 'Cozinha',
  perm_entregadores: 'Entregadores',
  perm_pdv: 'PDV',
  perm_pedidos: 'Pedidos',
  perm_produtos: 'Produtos',
  perm_categorias: 'Categorias',
  perm_acrescimos: 'Acréscimos',
  perm_cupons: 'Cupons',
  perm_relatorios: 'Relatórios',
  perm_taxas_entrega: 'Taxas de Entrega',
  perm_horarios: 'Horários',
  perm_configuracoes: 'Configurações',
  perm_qrcode: 'QR Codes',
  perm_usuarios: 'Usuários',
  perm_backup: 'Backup',
};

export type PermMap = Record<PermKey, boolean>;

export interface AdminUser {
  id: string;
  usuario: string;
  acesso_operacoes: boolean;
  acesso_gestao: boolean;
  acesso_sistema: boolean;
  created_at: string;
  login_email?: string;
  // Per-menu permissions
  perm_dashboard: boolean;
  perm_cozinha: boolean;
  perm_entregadores: boolean;
  perm_pdv: boolean;
  perm_pedidos: boolean;
  perm_produtos: boolean;
  perm_categorias: boolean;
  perm_acrescimos: boolean;
  perm_cupons: boolean;
  perm_relatorios: boolean;
  perm_taxas_entrega: boolean;
  perm_horarios: boolean;
  perm_configuracoes: boolean;
  perm_qrcode: boolean;
  perm_usuarios: boolean;
  perm_backup: boolean;
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
        .select('id, usuario, acesso_operacoes, acesso_gestao, acesso_sistema, created_at, login_email, perm_dashboard, perm_cozinha, perm_entregadores, perm_pdv, perm_pedidos, perm_produtos, perm_categorias, perm_acrescimos, perm_cupons, perm_relatorios, perm_taxas_entrega, perm_horarios, perm_configuracoes, perm_qrcode, perm_usuarios, perm_backup')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as unknown as AdminUser[];
    },
  });
}

export function useCreateAdminUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      usuario: string;
      senha: string;
      permissions: PermMap;
    }) => {
      return callManageAdminUser({
        action: 'create',
        usuario: params.usuario,
        senha: params.senha,
        ...params.permissions,
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
      permissions?: PermMap;
    }) => {
      if (params.senha) {
        return callManageAdminUser({
          action: 'change_password',
          id: params.id,
          senha: params.senha,
        });
      }

      const { id, senha, permissions, ...rest } = params;
      return callManageAdminUser({
        action: 'update',
        id,
        ...rest,
        ...(permissions || {}),
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
