
-- Function to send push notification to waiters when kitchen item is ready
CREATE OR REPLACE FUNCTION public.notify_waiter_item_ready()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  payload jsonb;
  service_key text;
  func_url text;
  v_table_number integer;
  v_table_name text;
  v_waiter_id uuid;
  v_waiter_name text;
BEGIN
  -- Only trigger when status changes to 'ready'
  IF NEW.status = 'ready' AND (OLD.status IS DISTINCT FROM 'ready') THEN
    -- Get table and waiter info from the table_order
    SELECT t.number, t.name, to2.waiter_id, to2.waiter_name
    INTO v_table_number, v_table_name, v_waiter_id, v_waiter_name
    FROM table_orders to2
    LEFT JOIN tables t ON t.id = to2.table_id
    WHERE to2.id = NEW.table_order_id;

    payload := jsonb_build_object(
      'type', 'waiter_item_ready',
      'record', jsonb_build_object(
        'item_id', NEW.id,
        'product_name', NEW.product_name,
        'quantity', NEW.quantity,
        'table_number', v_table_number,
        'table_name', v_table_name,
        'waiter_id', v_waiter_id,
        'waiter_name', v_waiter_name,
        'table_order_id', NEW.table_order_id
      )
    );

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
      RAISE WARNING 'Waiter push notification trigger failed: %', SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$function$;

-- Create trigger on table_order_items
DROP TRIGGER IF EXISTS on_table_order_item_ready ON public.table_order_items;
CREATE TRIGGER on_table_order_item_ready
  AFTER UPDATE ON public.table_order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_waiter_item_ready();
