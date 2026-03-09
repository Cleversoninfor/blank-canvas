-- Add customer_names column to store customer names from dine-in orders
ALTER TABLE public.table_orders 
ADD COLUMN IF NOT EXISTS customer_names text[] DEFAULT '{}';

-- Add comment for clarity
COMMENT ON COLUMN public.table_orders.customer_names IS 'Array of customer names who ordered via dine-in menu';