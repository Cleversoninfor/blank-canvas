ALTER TABLE public.admin_users ADD COLUMN IF NOT EXISTS perm_consumir_local boolean NOT NULL DEFAULT false;

-- Add a location column to tables for "Interno" / "Externo" etc.
ALTER TABLE public.tables ADD COLUMN IF NOT EXISTS location text;