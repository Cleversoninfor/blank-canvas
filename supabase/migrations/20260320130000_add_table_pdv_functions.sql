-- Function to update table order total
CREATE OR REPLACE FUNCTION public.update_table_order_total(_order_id bigint, _additional_amount numeric)
RETURNS void AS $$
BEGIN
  UPDATE public.table_orders
  SET total_amount = coalesce(total_amount, 0) + _additional_amount,
      updated_at = now()
  WHERE id = _order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to transfer items between tables or comandas
-- This is a placeholder, we might implement the logic in JS first for simplicity 
-- but having a robust SQL function is better.
