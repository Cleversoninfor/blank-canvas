
-- Add columns to link admin_users to Supabase Auth
ALTER TABLE public.admin_users
ADD COLUMN IF NOT EXISTS auth_user_id uuid,
ADD COLUMN IF NOT EXISTS login_email text;

CREATE UNIQUE INDEX IF NOT EXISTS admin_users_auth_user_id_idx
  ON public.admin_users (auth_user_id)
  WHERE auth_user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS admin_users_login_email_idx
  ON public.admin_users (login_email)
  WHERE login_email IS NOT NULL;

-- Drop old function to allow return type change
DROP FUNCTION IF EXISTS public.verify_admin_login(text, text);

-- Recreate with expanded return type
CREATE OR REPLACE FUNCTION public.verify_admin_login(_usuario text, _senha text)
RETURNS TABLE(
  id uuid,
  usuario text,
  acesso_operacoes boolean,
  acesso_gestao boolean,
  acesso_sistema boolean,
  login_email text,
  auth_user_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    au.id,
    au.usuario,
    au.acesso_operacoes,
    au.acesso_gestao,
    au.acesso_sistema,
    au.login_email,
    au.auth_user_id
  FROM public.admin_users au
  WHERE lower(au.usuario) = lower(_usuario)
    AND au.senha = crypt(_senha, au.senha);
END;
$function$;
