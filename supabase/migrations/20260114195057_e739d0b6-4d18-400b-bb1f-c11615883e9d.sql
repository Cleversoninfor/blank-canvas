-- Add floating image URL field to store_config
ALTER TABLE public.store_config
ADD COLUMN floating_image_url TEXT NULL;