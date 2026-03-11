
-- Fix the edge function URL to point to the correct Supabase project
CREATE OR REPLACE FUNCTION public.notify_order_push()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  payload jsonb;
  service_key text;
  func_url text;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    payload := jsonb_build_object('type', 'new_order', 'record', row_to_json(NEW));
  ELSIF TG_OP = 'UPDATE' AND NEW.driver_id IS NOT NULL AND (OLD.driver_id IS NULL OR OLD.driver_id IS DISTINCT FROM NEW.driver_id) THEN
    payload := jsonb_build_object('type', 'driver_assigned', 'record', row_to_json(NEW));
  ELSE
    RETURN NEW;
  END IF;

  BEGIN
    SELECT decrypted_secret INTO service_key
    FROM vault.decrypted_secrets
    WHERE name = 'SUPABASE_SERVICE_ROLE_KEY'
    LIMIT 1;

    func_url := 'https://ofcqzuiuokfyxfehijbk.supabase.co/functions/v1/send-order-notification';

    PERFORM net.http_post(
      url := func_url,
      body := payload,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_key
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Push notification trigger failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;
