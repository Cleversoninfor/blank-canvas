
CREATE OR REPLACE FUNCTION public.driver_update_order_status(
  _order_id bigint,
  _driver_id uuid,
  _new_status text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only allow drivers to update their own assigned orders
  -- Only allow valid transitions: ready -> delivery, delivery -> completed
  IF _new_status NOT IN ('delivery', 'completed') THEN
    RAISE EXCEPTION 'Invalid status transition for driver';
  END IF;

  UPDATE public.orders
  SET status = _new_status,
      updated_at = now()
  WHERE id = _order_id
    AND driver_id = _driver_id
    AND (
      (_new_status = 'delivery' AND status = 'ready')
      OR (_new_status = 'completed' AND status = 'delivery')
    );

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found or invalid status transition';
  END IF;

  RETURN true;
END;
$$;
