-- Drop the existing status check constraint and create a new one that includes 'ready'
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- Add new constraint that includes 'ready' status
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check 
  CHECK (status IN ('pending', 'preparing', 'ready', 'delivery', 'completed', 'cancelled'));