
-- Fix the trigger to include extensions schema for pgcrypto
CREATE OR REPLACE FUNCTION public.hash_admin_password()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.senha IS DISTINCT FROM OLD.senha THEN
    NEW.senha := crypt(NEW.senha, gen_salt('bf'));
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

-- Also fix verify_admin_login to include extensions schema
CREATE OR REPLACE FUNCTION public.verify_admin_login(_usuario text, _senha text)
 RETURNS TABLE(id uuid, usuario text, acesso_operacoes boolean, acesso_gestao boolean, acesso_sistema boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  RETURN QUERY
  SELECT au.id, au.usuario, au.acesso_operacoes, au.acesso_gestao, au.acesso_sistema
  FROM public.admin_users au
  WHERE au.usuario = _usuario
    AND au.senha = crypt(_senha, au.senha);
END;
$function$;
