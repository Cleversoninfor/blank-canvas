
-- Create comandas table
CREATE TABLE public.comandas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_comanda integer NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.comandas ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Comandas are publicly readable" ON public.comandas FOR SELECT TO public USING (true);
CREATE POLICY "Admins can insert comandas" ON public.comandas FOR INSERT TO public WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update comandas" ON public.comandas FOR UPDATE TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete comandas" ON public.comandas FOR DELETE TO public USING (has_role(auth.uid(), 'admin'::app_role));

-- Create comanda_pedidos junction table
CREATE TABLE public.comanda_pedidos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comanda_id uuid NOT NULL REFERENCES public.comandas(id) ON DELETE RESTRICT,
  pedido_id bigint NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.comanda_pedidos ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Comanda pedidos are publicly readable" ON public.comanda_pedidos FOR SELECT TO public USING (true);
CREATE POLICY "Admins can insert comanda pedidos" ON public.comanda_pedidos FOR INSERT TO public WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete comanda pedidos" ON public.comanda_pedidos FOR DELETE TO public USING (has_role(auth.uid(), 'admin'::app_role));
