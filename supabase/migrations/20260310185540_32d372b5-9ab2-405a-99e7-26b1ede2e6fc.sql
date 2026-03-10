ALTER TABLE public.store_config 
  ADD COLUMN IF NOT EXISTS hero_banner_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS floating_image_enabled boolean DEFAULT true;