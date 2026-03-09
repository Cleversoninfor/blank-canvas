-- Fix validate_coupon to include coupons that expire on the current day (until end of day)
CREATE OR REPLACE FUNCTION public.validate_coupon(coupon_code text)
 RETURNS TABLE(id uuid, code text, discount_type text, discount_value numeric, min_order_value numeric, is_valid boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.code,
    c.discount_type,
    c.discount_value,
    c.min_order_value,
    (c.is_active = true 
      AND (c.expires_at IS NULL OR c.expires_at::date >= CURRENT_DATE)
      AND (c.max_uses IS NULL OR c.current_uses < c.max_uses)
    ) as is_valid
  FROM public.coupons c
  WHERE UPPER(c.code) = UPPER(coupon_code);
END;
$function$;