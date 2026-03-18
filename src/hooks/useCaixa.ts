import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CaixaSession {
  id: string;
  opened_at: string;
  closed_at: string | null;
  initial_balance: number;
  status: 'open' | 'closed';
  created_at: string;
}

export interface CaixaMovimentacao {
  id: string;
  session_id: string;
  type: 'entrada' | 'saida' | 'sangria';
  amount: number;
  description: string | null;
  created_at: string;
}

export function useOpenedSession() {
  return useQuery({
    queryKey: ['caixa-session-active'],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('caixa_sessions' as any) as any)
        .select('*')
        .eq('status', 'open')
        .maybeSingle();

      if (error) throw error;
      return data as CaixaSession | null;
    },
  });
}

export function useOpenCaixa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (initialBalance: number) => {
      const { data, error } = await (supabase
        .from('caixa_sessions' as any) as any)
        .insert({
          initial_balance: initialBalance,
          status: 'open',
        })
        .select()
        .single();

      if (error) throw error;
      return data as CaixaSession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caixa-session-active'] });
    },
  });
}

export function useSangria() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sessionId, amount, description }: { sessionId: string; amount: number; description: string }) => {
      const { data, error } = await (supabase
        .from('caixa_movimentacoes' as any) as any)
        .insert({
          session_id: sessionId,
          type: 'sangria',
          amount: amount,
          description: description,
        })
        .select()
        .single();

      if (error) throw error;
      return data as CaixaMovimentacao;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caixa-movimentacoes'] });
      queryClient.invalidateQueries({ queryKey: ['caixa-balance'] });
    },
  });
}

export function useAddMovimentacao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sessionId, type, amount, description }: { sessionId: string; type: 'entrada' | 'saida' | 'sangria'; amount: number; description?: string }) => {
      const { data, error } = await (supabase
        .from('caixa_movimentacoes' as any) as any)
        .insert({
          session_id: sessionId,
          type: type,
          amount: amount,
          description: description,
        })
        .select()
        .single();

      if (error) throw error;
      return data as CaixaMovimentacao;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caixa-movimentacoes'] });
      queryClient.invalidateQueries({ queryKey: ['caixa-balance'] });
    },
  });
}

export function useCaixaBalance(sessionId?: string) {
  return useQuery({
    queryKey: ['caixa-balance', sessionId],
    queryFn: async () => {
      if (!sessionId) return { initial: 0, entradas: 0, saidas: 0, current: 0 };

      // 1. Get session info
      const { data: session, error: sessError } = await (supabase
        .from('caixa_sessions' as any) as any)
        .select('initial_balance')
        .eq('id', sessionId)
        .single();
      
      if (sessError) throw sessError;

      // 2. Get all movements
      const { data: movs, error: movsError } = await (supabase
        .from('caixa_movimentacoes' as any) as any)
        .select('type, amount')
        .eq('session_id', sessionId);

      if (movsError) throw movsError;

      const initial = Number(session.initial_balance) || 0;
      let entradas = 0;
      let saidas = 0;

      (movs || []).forEach((m: any) => {
        if (m.type === 'entrada') {
          entradas += Number(m.amount);
        } else {
          saidas += Number(m.amount); // For types 'saida' and 'sangria'
        }
      });

      return {
        initial,
        entradas,
        saidas,
        current: initial + entradas - saidas,
      };
    },
    enabled: !!sessionId,
  });
}

export function useCloseCaixa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await (supabase
        .from('caixa_sessions' as any) as any)
        .update({
          status: 'closed',
          closed_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caixa-session-active'] });
    },
  });
}
