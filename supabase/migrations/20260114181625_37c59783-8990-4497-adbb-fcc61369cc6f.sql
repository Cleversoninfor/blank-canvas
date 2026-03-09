-- Add custom domain/subdomain configuration to store_config
ALTER TABLE public.store_config 
ADD COLUMN IF NOT EXISTS custom_domain TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS subdomain_slug TEXT DEFAULT NULL;