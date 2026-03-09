-- =====================================================
-- CORREÇÃO DE SEGURANÇA - RLS POLICIES
-- =====================================================

-- 1. ORDERS TABLE - Restringir acesso público
-- Remover política de leitura pública
DROP POLICY IF EXISTS "Orders are publicly readable" ON public.orders;
DROP POLICY IF EXISTS "Orders can be updated" ON public.orders;

-- Apenas admins podem ler todos os pedidos
CREATE POLICY "Admins can read all orders" 
ON public.orders 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Apenas admins podem atualizar pedidos
CREATE POLICY "Admins can update orders" 
ON public.orders 
FOR UPDATE 
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- 2. CUSTOMER_ADDRESSES TABLE - Restringir acesso
DROP POLICY IF EXISTS "Anyone can view addresses" ON public.customer_addresses;
DROP POLICY IF EXISTS "Anyone can insert addresses" ON public.customer_addresses;
DROP POLICY IF EXISTS "Anyone can update addresses" ON public.customer_addresses;
DROP POLICY IF EXISTS "Anyone can delete addresses" ON public.customer_addresses;

-- Endereços são públicos para inserção (necessário para checkout)
CREATE POLICY "Anyone can insert addresses" 
ON public.customer_addresses 
FOR INSERT 
WITH CHECK (true);

-- Apenas admins podem ler todos os endereços
CREATE POLICY "Admins can read all addresses" 
ON public.customer_addresses 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Apenas admins podem atualizar endereços
CREATE POLICY "Admins can update addresses" 
ON public.customer_addresses 
FOR UPDATE 
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Apenas admins podem deletar endereços
CREATE POLICY "Admins can delete addresses" 
ON public.customer_addresses 
FOR DELETE 
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- 3. COUPONS TABLE - Restringir visualização
DROP POLICY IF EXISTS "Coupons are publicly readable" ON public.coupons;

-- Apenas admins podem ver todos os cupons
CREATE POLICY "Admins can read all coupons" 
ON public.coupons 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Função para validar cupom (sem expor todos os cupons)
CREATE OR REPLACE FUNCTION public.validate_coupon(coupon_code text)
RETURNS TABLE (
  id uuid,
  code text,
  discount_type text,
  discount_value numeric,
  min_order_value numeric,
  is_valid boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.code,
    c.discount_type,
    c.discount_value,
    c.min_order_value,
    (c.is_active = true 
      AND (c.expires_at IS NULL OR c.expires_at > now())
      AND (c.max_uses IS NULL OR c.current_uses < c.max_uses)
    ) as is_valid
  FROM public.coupons c
  WHERE UPPER(c.code) = UPPER(coupon_code);
END;
$$;

-- 4. TABLE_ORDERS - Restringir acesso de escrita
DROP POLICY IF EXISTS "Anyone can insert table orders" ON public.table_orders;
DROP POLICY IF EXISTS "Anyone can update table orders" ON public.table_orders;

-- Manter apenas acesso de admin para inserção/atualização
-- (já existe "Admins can insert/update table orders")

-- 5. TABLE_ORDER_ITEMS - Restringir acesso de escrita
DROP POLICY IF EXISTS "Anyone can insert table order items" ON public.table_order_items;
DROP POLICY IF EXISTS "Anyone can update table order items" ON public.table_order_items;
DROP POLICY IF EXISTS "Anyone can delete table order items" ON public.table_order_items;

-- Manter apenas acesso de admin (já existem as políticas de admin)

-- 6. TABLES - Restringir atualização pública
DROP POLICY IF EXISTS "Tables can be updated by anyone" ON public.tables;

-- Apenas admins podem atualizar mesas (já existe "Admins can update tables")

-- 7. STORE_CONFIG - Criar função para retornar config pública sem dados sensíveis
CREATE OR REPLACE FUNCTION public.get_public_store_config()
RETURNS TABLE (
  id uuid,
  name text,
  logo_url text,
  cover_url text,
  is_open boolean,
  delivery_fee numeric,
  delivery_fee_mode text,
  min_order_value numeric,
  address text,
  delivery_time_min integer,
  delivery_time_max integer,
  primary_color text,
  secondary_color text,
  accent_color text,
  pwa_name text,
  pwa_short_name text,
  hero_text_1 text,
  hero_text_2 text,
  hero_text_3 text,
  hero_slogan text,
  floating_image_url text,
  floating_image_size integer,
  floating_image_position integer,
  floating_image_vertical_position integer,
  floating_image_size_mobile integer,
  floating_image_position_mobile integer,
  floating_image_vertical_position_mobile integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id, name, logo_url, cover_url, is_open, delivery_fee, delivery_fee_mode,
    min_order_value, address, delivery_time_min, delivery_time_max,
    primary_color, secondary_color, accent_color, pwa_name, pwa_short_name,
    hero_text_1, hero_text_2, hero_text_3, hero_slogan,
    floating_image_url, floating_image_size, floating_image_position,
    floating_image_vertical_position, floating_image_size_mobile,
    floating_image_position_mobile, floating_image_vertical_position_mobile
  FROM public.store_config
  LIMIT 1;
$$;