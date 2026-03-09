
-- Drop the old overload (11 params, returns bigint) that doesn't support lat/lng
DROP FUNCTION IF EXISTS public.create_order_with_items(text, text, text, text, text, numeric, text, jsonb, text, text, numeric);

-- Recreate the single version with lat/lng support
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
  _change_for numeric DEFAULT NULL,
  _latitude double precision DEFAULT NULL,
  _longitude double precision DEFAULT NULL
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _order_id integer;
  _item jsonb;
BEGIN
  INSERT INTO public.orders (
    customer_name, customer_phone, address_street, address_number,
    address_neighborhood, address_complement, address_reference,
    total_amount, payment_method, change_for, latitude, longitude, status
  ) VALUES (
    _customer_name, _customer_phone, _address_street, _address_number,
    _address_neighborhood, _address_complement, _address_reference,
    _total_amount, _payment_method, _change_for, _latitude, _longitude, 'pending'
  ) RETURNING id INTO _order_id;

  FOR _item IN SELECT * FROM jsonb_array_elements(_items)
  LOOP
    INSERT INTO public.order_items (order_id, product_name, quantity, unit_price, observation)
    VALUES (
      _order_id,
      _item->>'product_name',
      (_item->>'quantity')::integer,
      (_item->>'unit_price')::numeric,
      _item->>'observation'
    );
  END LOOP;

  RETURN _order_id;
END;
$$;
