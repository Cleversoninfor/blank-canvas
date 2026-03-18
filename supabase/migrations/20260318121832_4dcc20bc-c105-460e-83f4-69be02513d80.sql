
-- Add individual per-menu permission columns to admin_users
ALTER TABLE public.admin_users
  ADD COLUMN IF NOT EXISTS perm_dashboard boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS perm_cozinha boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS perm_entregadores boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS perm_pdv boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS perm_pedidos boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS perm_produtos boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS perm_categorias boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS perm_acrescimos boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS perm_cupons boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS perm_relatorios boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS perm_taxas_entrega boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS perm_horarios boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS perm_configuracoes boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS perm_qrcode boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS perm_usuarios boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS perm_backup boolean NOT NULL DEFAULT false;

-- Migrate existing permissions to new columns
UPDATE public.admin_users SET
  perm_dashboard = acesso_operacoes,
  perm_cozinha = acesso_operacoes,
  perm_entregadores = acesso_operacoes,
  perm_pdv = acesso_operacoes,
  perm_pedidos = acesso_gestao,
  perm_produtos = acesso_gestao,
  perm_categorias = acesso_gestao,
  perm_acrescimos = acesso_gestao,
  perm_cupons = acesso_gestao,
  perm_relatorios = acesso_gestao,
  perm_taxas_entrega = acesso_sistema,
  perm_horarios = acesso_sistema,
  perm_configuracoes = acesso_sistema,
  perm_qrcode = acesso_sistema,
  perm_usuarios = acesso_sistema,
  perm_backup = acesso_sistema;
