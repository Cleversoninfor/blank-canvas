-- Migração para criação das tabelas de controle de caixa

CREATE TABLE IF NOT EXISTS public.caixa_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    opened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    closed_at TIMESTAMP WITH TIME ZONE,
    initial_balance DECIMAL(10,2) NOT NULL DEFAULT 0,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.caixa_movimentacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.caixa_sessions(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('entrada', 'saida', 'sangria')),
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS (Row Level Security) se necessário
ALTER TABLE public.caixa_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caixa_movimentacoes ENABLE ROW LEVEL SECURITY;

-- Políticas simples para permitir acesso autenticado (ajuste conforme necessário)
CREATE POLICY "Permitir tudo para usuários autenticados em caixa_sessions" 
ON public.caixa_sessions FOR ALL TO authenticated USING (true);

CREATE POLICY "Permitir tudo para usuários autenticados em caixa_movimentacoes" 
ON public.caixa_movimentacoes FOR ALL TO authenticated USING (true);
