-- Add consume_on_site_enabled to system_settings
ALTER TABLE public.system_settings
ADD COLUMN IF NOT EXISTS consume_on_site_enabled BOOLEAN DEFAULT true;

-- Ensure the existing row has the value set
UPDATE public.system_settings
SET consume_on_site_enabled = true
WHERE id = 1;

-- Add a public read policy so the menu page (unauthenticated) can read settings
DROP POLICY IF EXISTS "Allow public to read system_settings" ON public.system_settings;
CREATE POLICY "Allow public to read system_settings"
ON public.system_settings FOR SELECT
TO anon
USING (true);
