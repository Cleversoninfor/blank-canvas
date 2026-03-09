-- Garantir permissões de INSERT e SELECT para o role anon na tabela orders
GRANT SELECT, INSERT ON public.orders TO anon;
GRANT SELECT ON public.orders TO authenticated;

-- Garantir permissões na tabela order_items
GRANT SELECT, INSERT ON public.order_items TO anon;
GRANT SELECT ON public.order_items TO authenticated;

-- Garantir acesso à sequence do ID (necessário para insert)
GRANT USAGE, SELECT ON SEQUENCE public.orders_id_seq TO anon;
GRANT USAGE, SELECT ON SEQUENCE public.orders_id_seq TO authenticated;