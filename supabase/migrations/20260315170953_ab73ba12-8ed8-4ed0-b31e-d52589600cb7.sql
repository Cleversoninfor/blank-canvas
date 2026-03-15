CREATE POLICY "Anyone can update comanda_pedidos"
ON public.comanda_pedidos
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);