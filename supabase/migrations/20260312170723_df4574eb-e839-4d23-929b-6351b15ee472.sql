
-- Allow public to update comandas (for PDV status changes)
CREATE POLICY "Anyone can update comandas"
  ON public.comandas FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Allow public to insert comandas (for PDV comanda creation)
CREATE POLICY "Anyone can insert comandas"
  ON public.comandas FOR INSERT
  TO public
  WITH CHECK (true);

-- Allow public to delete comandas (for PDV)
CREATE POLICY "Anyone can delete comandas"
  ON public.comandas FOR DELETE
  TO public
  USING (true);

-- Allow public to insert comanda_pedidos (for PDV order linking)
CREATE POLICY "Anyone can insert comanda_pedidos"
  ON public.comanda_pedidos FOR INSERT
  TO public
  WITH CHECK (true);

-- Allow public to delete comanda_pedidos (for closing sales)
CREATE POLICY "Anyone can delete comanda_pedidos"
  ON public.comanda_pedidos FOR DELETE
  TO public
  USING (true);

-- Allow public to insert comanda_vendas (for closing sales from PDV)
CREATE POLICY "Anyone can insert comanda_vendas"
  ON public.comanda_vendas FOR INSERT
  TO public
  WITH CHECK (true);

-- Allow public to read comanda_vendas (for close sale modal)
CREATE POLICY "Comanda vendas are publicly readable"
  ON public.comanda_vendas FOR SELECT
  TO public
  USING (true);
