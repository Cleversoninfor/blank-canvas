-- Add public SELECT policy for orders table so kitchen can read orders
-- This is needed because the kitchen page needs to see pending/preparing orders

CREATE POLICY "Orders are publicly readable" 
ON public.orders 
FOR SELECT 
USING (true);