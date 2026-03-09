
-- Push subscriptions table
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_type text NOT NULL DEFAULT 'admin',
  user_identifier text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert push subscriptions" ON public.push_subscriptions FOR INSERT WITH CHECK (true);
CREATE POLICY "Push subscriptions are readable" ON public.push_subscriptions FOR SELECT USING (true);
CREATE POLICY "Anyone can delete push subscriptions" ON public.push_subscriptions FOR DELETE USING (true);

-- VAPID keys table (stores generated Web Push keys)
CREATE TABLE IF NOT EXISTS public.vapid_keys (
  id text PRIMARY KEY DEFAULT 'default',
  public_key text NOT NULL,
  private_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vapid_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "VAPID keys are readable" ON public.vapid_keys FOR SELECT USING (true);
CREATE POLICY "VAPID keys can be inserted" ON public.vapid_keys FOR INSERT WITH CHECK (NOT EXISTS (SELECT 1 FROM public.vapid_keys));

-- Trigger function to call edge function on new orders / driver assignment
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

    func_url := 'https://wvejbkiawzzdosmnmkpp.supabase.co/functions/v1/send-order-notification';

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

CREATE TRIGGER on_order_push_notification
AFTER INSERT OR UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.notify_order_push();
