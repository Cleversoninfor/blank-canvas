
-- Create comanda_vendas table for sales history
CREATE TABLE public.comanda_vendas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comanda_id uuid REFERENCES public.comandas(id) ON DELETE SET NULL,
  valor_total numeric NOT NULL DEFAULT 0,
  forma_pagamento text NOT NULL,
  data_venda timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.comanda_vendas ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Comanda vendas are readable by admins" ON public.comanda_vendas
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert comanda vendas" ON public.comanda_vendas
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Update existing comandas from 'active' to 'livre'
UPDATE public.comandas SET status = 'livre' WHERE status = 'active';
