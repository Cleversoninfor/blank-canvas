-- Make public order lookup robust to phone formatting by comparing only digits
CREATE OR REPLACE FUNCTION public.get_order_with_items_public(
  _order_id integer,
  _customer_phone text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o public.orders%ROWTYPE;
  items jsonb;
  phone_norm text;
BEGIN
  phone_norm := regexp_replace(COALESCE(_customer_phone, ''), '\\D', '', 'g');

  -- Match by id + normalized phone to avoid leaking other customers' orders
  SELECT *
    INTO o
  FROM public.orders
  WHERE id = _order_id
    AND regexp_replace(COALESCE(customer_phone, ''), '\\D', '', 'g') = phone_norm;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', oi.id,
        'order_id', oi.order_id,
        'product_name', oi.product_name,
        'quantity', oi.quantity,
        'unit_price', oi.unit_price,
        'observation', oi.observation,
        'created_at', oi.created_at
      )
      ORDER BY oi.created_at ASC
    ),
    '[]'::jsonb
  )
  INTO items
  FROM public.order_items oi
  WHERE oi.order_id = _order_id;

  RETURN jsonb_build_object(
    'order', to_jsonb(o),
    'items', items
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_order_with_items_public(integer, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_order_with_items_public(integer, text) TO authenticated;