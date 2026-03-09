-- Allow anyone to insert table orders (for dine-in from public menu)
CREATE POLICY "Anyone can create table orders" 
ON public.table_orders 
FOR INSERT 
WITH CHECK (true);

-- Allow anyone to insert table order items
CREATE POLICY "Anyone can insert table order items" 
ON public.table_order_items 
FOR INSERT 
WITH CHECK (true);

-- Allow anyone to update tables (to mark as occupied)
CREATE POLICY "Anyone can update table status" 
ON public.tables 
FOR UPDATE 
USING (true);