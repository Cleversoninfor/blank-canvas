-- Add hero banner customization fields to store_config
ALTER TABLE public.store_config
ADD COLUMN IF NOT EXISTS hero_text_1 TEXT DEFAULT 'Carne macia',
ADD COLUMN IF NOT EXISTS hero_text_2 TEXT DEFAULT 'Suculenta',
ADD COLUMN IF NOT EXISTS hero_text_3 TEXT DEFAULT 'Sabor Irresistível',
ADD COLUMN IF NOT EXISTS hero_slogan TEXT DEFAULT 'O segredo está no tempero';