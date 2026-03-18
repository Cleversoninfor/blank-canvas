-- Add checkout_whatsapp_message column to store_config
ALTER TABLE public.store_config 
ADD COLUMN IF NOT EXISTS checkout_whatsapp_message text;

-- Add a comment for better documentation
COMMENT ON COLUMN public.store_config.checkout_whatsapp_message IS 'Template for the automatic WhatsApp message sent after checkout';
