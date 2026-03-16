
-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create admin_users table
CREATE TABLE public.admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario text NOT NULL UNIQUE,
  senha text NOT NULL,
  acesso_operacoes boolean NOT NULL DEFAULT false,
  acesso_gestao boolean NOT NULL DEFAULT false,
  acesso_sistema boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Only admins can read admin_users
CREATE POLICY "Admins can read admin users"
ON public.admin_users FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can insert admin users
CREATE POLICY "Admins can insert admin users"
ON public.admin_users FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can update admin users
CREATE POLICY "Admins can update admin users"
ON public.admin_users FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete admin users
CREATE POLICY "Admins can delete admin users"
ON public.admin_users FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to hash password on insert/update
CREATE OR REPLACE FUNCTION public.hash_admin_password()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only hash if password changed
  IF TG_OP = 'INSERT' OR NEW.senha IS DISTINCT FROM OLD.senha THEN
    NEW.senha := crypt(NEW.senha, gen_salt('bf'));
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER hash_admin_password_trigger
BEFORE INSERT OR UPDATE ON public.admin_users
FOR EACH ROW
EXECUTE FUNCTION public.hash_admin_password();

-- Function to verify admin user login (security definer to bypass RLS)
CREATE OR REPLACE FUNCTION public.verify_admin_login(_usuario text, _senha text)
RETURNS TABLE(id uuid, usuario text, acesso_operacoes boolean, acesso_gestao boolean, acesso_sistema boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT au.id, au.usuario, au.acesso_operacoes, au.acesso_gestao, au.acesso_sistema
  FROM public.admin_users au
  WHERE au.usuario = _usuario
    AND au.senha = crypt(_senha, au.senha);
END;
$$;
