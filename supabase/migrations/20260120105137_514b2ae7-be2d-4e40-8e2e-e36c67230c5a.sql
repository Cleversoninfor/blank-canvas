-- Add operation mode columns to store_config
ALTER TABLE public.store_config 
ADD COLUMN IF NOT EXISTS mode_delivery_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS mode_pickup_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS mode_dine_in_enabled boolean DEFAULT true;