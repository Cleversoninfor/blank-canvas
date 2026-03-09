-- Função segura (security definer) para criar pedido + itens sem precisar SELECT em orders
CREATE OR REPLACE FUNCTION public.create_order_with_items(
  _customer_name text,
  _customer_phone text,
  _address_street text,
  _address_number text,
  _address_neighborhood text,
  _total_amount numeric,
  _payment_method text,
  _items jsonb,
  _address_complement text DEFAULT NULL,
  _address_reference text DEFAULT NULL,
  _change_for numeric DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id bigint;
BEGIN
  -- Insert order
  INSERT INTO public.orders (
    customer_name,
    customer_phone,
    address_street,
    address_number,
    address_neighborhood,
    address_complement,
    address_reference,
    total_amount,
    payment_method,
    change_for,
    status
  )
  VALUES (
    _customer_name,
    _customer_phone,
    _address_street,
    _address_number,
    _address_neighborhood,
    _address_complement,
    _address_reference,
    _total_amount,
    _payment_method,
    _change_for,
    'pending'
  )
  RETURNING id INTO v_order_id;

  -- Insert items (expects JSON array)
  INSERT INTO public.order_items (
    order_id,
    product_name,
    quantity,
    unit_price,
    observation
  )
  SELECT
    v_order_id,
    (x.product_name)::text,
    COALESCE((x.quantity)::int, 1),
    COALESCE((x.unit_price)::numeric, 0),
    NULLIF((x.observation)::text, '')
  FROM jsonb_to_recordset(COALESCE(_items, '[]'::jsonb)) AS x(
    product_name text,
    quantity int,
    unit_price numeric,
    observation text
  );

  RETURN v_order_id;
END;
$$;

-- Permitir execução para clientes e usuários logados
GRANT EXECUTE ON FUNCTION public.create_order_with_items(
  text, text, text, text, text, numeric, text, jsonb, text, text, numeric
) TO anon;
GRANT EXECUTE ON FUNCTION public.create_order_with_items(
  text, text, text, text, text, numeric, text, jsonb, text, text, numeric
) TO authenticated;