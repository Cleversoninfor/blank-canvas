-- Add vertical position and mobile-specific settings for floating image
ALTER TABLE public.store_config
ADD COLUMN IF NOT EXISTS floating_image_vertical_position integer DEFAULT 50,
ADD COLUMN IF NOT EXISTS floating_image_size_mobile integer DEFAULT 100,
ADD COLUMN IF NOT EXISTS floating_image_position_mobile integer DEFAULT 50,
ADD COLUMN IF NOT EXISTS floating_image_vertical_position_mobile integer DEFAULT 70;