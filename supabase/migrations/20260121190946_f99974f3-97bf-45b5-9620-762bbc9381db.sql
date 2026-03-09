-- Drop the old check constraint for payment_method
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;

-- Add new constraint that includes credit and debit
ALTER TABLE public.orders ADD CONSTRAINT orders_payment_method_check 
  CHECK (payment_method = ANY (ARRAY['money'::text, 'card'::text, 'pix'::text, 'credit'::text, 'debit'::text]));