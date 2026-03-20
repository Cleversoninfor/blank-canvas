-- Migration para Reforço de Segurança (Row Level Security)
-- Remove permissões perigosas "USING (true)" criadas de forma genérica

-- 1. ORDERS e TABLE_ORDERS
DROP POLICY IF EXISTS "Orders can be updated" ON public.orders;
DROP POLICY IF EXISTS "Anyone can update table orders" ON public.table_orders;
DROP POLICY IF EXISTS "Anyone can update table status" ON public.table_orders;

CREATE POLICY "Admins and waiters can update orders" ON public.orders FOR UPDATE USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'waiter')
);
CREATE POLICY "Admins and waiters can update table orders" ON public.table_orders FOR UPDATE USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'waiter')
);

-- 2. COMANDAS
DROP POLICY IF EXISTS "Anyone can update comandas" ON public.comandas;
DROP POLICY IF EXISTS "Anyone can delete comandas" ON public.comandas;
DROP POLICY IF EXISTS "Anyone can insert comandas" ON public.comandas;

CREATE POLICY "Admins and waiters can insert comandas" ON public.comandas FOR INSERT WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'waiter')
);
CREATE POLICY "Admins and waiters can update comandas" ON public.comandas FOR UPDATE USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'waiter')
);
CREATE POLICY "Admins can delete comandas" ON public.comandas FOR DELETE USING (
  public.has_role(auth.uid(), 'admin')
);

-- 3. COMANDA PEDIDOS
DROP POLICY IF EXISTS "Anyone can update comanda_pedidos" ON public.comanda_pedidos;
DROP POLICY IF EXISTS "Anyone can delete comanda_pedidos" ON public.comanda_pedidos;

CREATE POLICY "Admins and waiters can update comanda_pedidos" ON public.comanda_pedidos FOR UPDATE USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'waiter')
);
CREATE POLICY "Admins and waiters can delete comanda_pedidos" ON public.comanda_pedidos FOR DELETE USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'waiter')
);

-- 4. CAIXA (Sessões e Movimentações)
-- Antes permitia a QUALQUER usuario deletar/editar tudo
DROP POLICY IF EXISTS "Permitir tudo para usuários autenticados em caixa_sessions" ON public.caixa_sessions;
DROP POLICY IF EXISTS "Permitir tudo para usuários autenticados em caixa_movimentacoes" ON public.caixa_movimentacoes;

CREATE POLICY "Admins and waiters can read caixa_sessions" ON public.caixa_sessions FOR SELECT USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'waiter')
);
CREATE POLICY "Admins and waiters can manage caixa_sessions" ON public.caixa_sessions FOR ALL USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'waiter')
);

CREATE POLICY "Admins and waiters can read caixa_movimentacoes" ON public.caixa_movimentacoes FOR SELECT USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'waiter')
);
CREATE POLICY "Admins and waiters can manage caixa_movimentacoes" ON public.caixa_movimentacoes FOR ALL USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'waiter')
);
