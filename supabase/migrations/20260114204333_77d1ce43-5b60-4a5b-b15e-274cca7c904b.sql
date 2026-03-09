-- Add floating image size and position fields to store_config
ALTER TABLE public.store_config
ADD COLUMN floating_image_size INTEGER DEFAULT 100,
ADD COLUMN floating_image_position INTEGER DEFAULT 50;