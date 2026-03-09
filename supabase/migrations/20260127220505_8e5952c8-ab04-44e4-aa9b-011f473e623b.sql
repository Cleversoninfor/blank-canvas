-- Add pickup time settings to store_config
ALTER TABLE public.store_config 
ADD COLUMN IF NOT EXISTS pickup_time_min integer DEFAULT 15,
ADD COLUMN IF NOT EXISTS pickup_time_max integer DEFAULT 25;