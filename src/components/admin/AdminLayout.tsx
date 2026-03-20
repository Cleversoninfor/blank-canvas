import { ReactNode, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { 
  ChefHat, 
  Settings, 
  ShoppingBag, 
  Tag, 
  Clock, 
  Ticket, 
  LogOut,
  Loader2,
  Menu,
  X,
  LayoutDashboard,
  ClipboardList,
  PlusCircle,
  Eye,
  MapPin,
  BarChart3,
  DatabaseBackup,
  QrCode,
  Truck,
  Monitor,
  Users as UsersIcon,
  Send,
  Receipt,
  Package,
  ExternalLink,
  UtensilsCrossed
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PWAInstallButton } from '@/components/pwa/PWAInstallButton';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useStoreConfig } from '@/hooks/useStore';
import { useStoreStatus } from '@/hooks/useStoreStatus';
import { useTheme } from '@/hooks/useTheme';
import { supabase } from '@/integrations/supabase/client';
import { usePWAConfig } from '@/hooks/usePWAConfig';
import { cn } from '@/lib/utils';
import { GlobalOrderNotification } from './GlobalOrderNotification';
import { InfornexaHeader } from './InfornexaHeader';
import type { PermKey } from '@/hooks/useAdminUsers';

interface AdminLayoutProps {
  children: ReactNode;
  title?: string;
}

// Each nav item now has a permKey linking to the per-menu permission column
const navGroups = [
  {
    label: 'Operações',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/admin', permKey: 'perm_dashboard' as PermKey },
      { id: 'kitchen', label: 'Cozinha', icon: ChefHat, path: '/kitchen', external: true, permKey: 'perm_cozinha' as PermKey },
      { id: 'drivers', label: 'Entregadores', icon: Truck, path: '/admin/drivers', permKey: 'perm_entregadores' as PermKey },
      { id: 'pdv', label: 'PDV', icon: Monitor, path: '/pdv', external: true, permKey: 'perm_pdv' as PermKey },
    ]
  },
  {
    label: 'Gestão',
    items: [
      { id: 'orders', label: 'Pedidos', icon: ClipboardList, path: '/admin/orders', permKey: 'perm_pedidos' as PermKey },
      { id: 'products', label: 'Produtos', icon: ShoppingBag, path: '/admin/products', permKey: 'perm_produtos' as PermKey },
      { id: 'ingredients', label: 'Estoque', icon: Package, path: '/admin/ingredients', permKey: 'perm_produtos' as PermKey },
      { id: 'categories', label: 'Categorias', icon: Tag, path: '/admin/categories', permKey: 'perm_categorias' as PermKey },
      { id: 'addons', label: 'Acréscimos', icon: PlusCircle, path: '/admin/addons', permKey: 'perm_acrescimos' as PermKey },
      { id: 'coupons', label: 'Cupons', icon: Ticket, path: '/admin/coupons', permKey: 'perm_cupons' as PermKey },
      { id: 'comandas', label: 'Comandas', icon: Receipt, path: '/admin/comandas', permKey: 'perm_pedidos' as PermKey },
      { id: 'dine-in', label: 'Consumir no Local', icon: UtensilsCrossed, path: '/admin/consumir-no-local', permKey: 'perm_consumir_local' as PermKey },
      { id: 'envios', label: 'Envios', icon: Send, path: '/admin/envios', permKey: 'perm_pedidos' as PermKey },
      { id: 'reports', label: 'Relatórios', icon: BarChart3, path: '/admin/reports', permKey: 'perm_relatorios' as PermKey },
    ]
  },
  {
    label: 'Sistema',
    items: [
      { id: 'delivery-zones', label: 'Taxas de Entrega', icon: MapPin, path: '/admin/delivery-zones', permKey: 'perm_taxas_entrega' as PermKey },
      { id: 'hours', label: 'Horários', icon: Clock, path: '/admin/hours', permKey: 'perm_horarios' as PermKey },
      { id: 'settings', label: 'Configurações', icon: Settings, path: '/admin/settings', permKey: 'perm_configuracoes' as PermKey },
      { id: 'qrcodes', label: 'QR Codes', icon: QrCode, path: '/admin/qrcodes', permKey: 'perm_qrcode' as PermKey },
      { id: 'users', label: 'Usuários', icon: UsersIcon, path: '/admin/users', permKey: 'perm_usuarios' as PermKey },
      { id: 'backup', label: 'Backup', icon: DatabaseBackup, path: '/admin/backup', permKey: 'perm_backup' as PermKey },
    ]
  },
  {
    label: 'Visualizar',
    items: [
      { id: 'menu', label: 'Ver Cardápio', icon: Eye, path: '/', external: true, permKey: undefined },
    ]
  }
];

export function AdminLayout({ children, title }: AdminLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading, isAdmin, refreshRole, signOut } = useAuth();
  const { toast } = useToast();
  const { data: store } = useStoreConfig();
  const storeStatus = useStoreStatus();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useTheme();
  usePWAConfig();

  // Fetch per-menu permissions for current user
  const { data: adminUserPerms } = useQuery({
    queryKey: ['admin-user-perms', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('admin_users')
        .select('perm_dashboard, perm_cozinha, perm_entregadores, perm_pdv, perm_pedidos, perm_produtos, perm_categorias, perm_acrescimos, perm_cupons, perm_relatorios, perm_taxas_entrega, perm_horarios, perm_configuracoes, perm_qrcode, perm_usuarios, perm_backup, perm_consumir_local')
        .or(`auth_user_id.eq.${user.id},usuario.eq.${user.email},usuario.eq.${user.email?.split('@')[0]}`)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id && isAdmin,
  });

  // Filter nav: show item if no record found (backwards compat) or if perm is true
  const filteredNavGroups = navGroups
    .map(group => ({
      ...group,
      items: group.items.filter(item => {
        if (!item.permKey) return true; // e.g. "Ver Cardápio"
        if (!adminUserPerms) return true; // no record = show all
        return (adminUserPerms as any)[item.permKey] === true;
      }),
    }))
    .filter(group => group.items.length > 0);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth');
    }
  }, [user, isLoading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: 'hsl(var(--admin-bg))' }}>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  if (!isAdmin) {
    return (
      <>
        <Helmet>
          <title>Acesso negado - {store?.name || 'Admin'}</title>
        </Helmet>
        <main className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: 'hsl(var(--admin-bg))' }}>
          <Card className="w-full max-w-md admin-card">
            <CardHeader>
              <CardTitle>Acesso negado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Sua conta ainda não tem permissão de administrador. Se você acabou de receber a permissão,
                atualize abaixo.
              </p>
              <div className="flex flex-col gap-2">
                <Button
                  onClick={async () => {
                    await refreshRole();
                    toast({ title: 'Permissões atualizadas', description: 'Se você for admin, o painel vai liberar automaticamente.' });
                  }}
                >
                  Atualizar permissões
                </Button>
                <Button variant="outline" onClick={handleSignOut}>Sair e entrar novamente</Button>
                <Button variant="ghost" onClick={() => navigate('/')}>Voltar ao cardápio</Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>{title || 'Admin'} - {store?.name || 'Delivery'}</title>
      </Helmet>

      <GlobalOrderNotification />
      <InfornexaHeader />

      <div className="min-h-screen flex" style={{ backgroundColor: 'hsl(var(--admin-bg))' }}>
        {sidebarOpen && (
          <div 
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <aside className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 lg:translate-x-0 flex flex-col",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )} style={{ backgroundColor: 'hsl(var(--sidebar-background))' }}>
          <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center overflow-hidden">
                {store?.logo_url ? (
                  <img src={store.logo_url} alt={`Logo ${store?.name || 'Admin'}`} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xl">🍔</span>
                )}
              </div>
              <div>
                <p className="font-bold text-white text-sm">{store?.name || 'Admin'}</p>
                <Badge variant={storeStatus.isOpen ? 'open' : 'closed'} className="text-xs">
                  {storeStatus.isOpen ? 'Aberto' : 'Fechado'}
                </Badge>
              </div>
            </div>
            <button className="lg:hidden text-white/70 hover:text-white" onClick={() => setSidebarOpen(false)}>
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 p-3 space-y-4 overflow-y-auto scrollbar-hide">
            {filteredNavGroups.map((group) => (
              <div key={group.label}>
                <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-widest text-white/40">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          if (item.external) {
                            window.open(item.path, '_blank');
                          } else {
                            navigate(item.path);
                          }
                          setSidebarOpen(false);
                        }}
                        className={cn(
                          "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                          isActive 
                            ? "text-white" 
                            : "text-white/60 hover:text-white"
                        )}
                        style={isActive ? {
                          backgroundColor: 'rgba(255,255,255,0.1)',
                          borderLeft: '3px solid hsl(var(--primary))',
                          paddingLeft: '9px',
                        } : {
                          backgroundColor: 'transparent',
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)';
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <item.icon className="h-[18px] w-[18px]" />
                        <span className="flex-1 text-left">{item.label}</span>
                        {item.external && <ExternalLink className="h-3.5 w-3.5 opacity-40" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="p-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
            <div className="hidden lg:block mb-3">
              <PWAInstallButton appName="Administrativo" />
            </div>
            
            <div className="flex items-center gap-3 mb-3">
              <div className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center">
                <span className="text-sm font-medium text-white">
                  {(user.user_metadata?.admin_usuario || user.email)?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user.user_metadata?.admin_usuario || user.user_metadata?.name || user.email}
                </p>
                <p className="text-xs text-white/50">
                  {isAdmin ? 'Administrador' : 'Usuário'}
                </p>
              </div>
            </div>
            <button 
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-white/60 hover:text-white transition-colors"
              style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'}
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </div>
        </aside>

        <div className="flex-1 flex flex-col min-h-screen min-w-0 overflow-x-hidden">
          <header className="sticky top-0 z-30 flex items-center gap-3 px-4 sm:px-6 py-3 shadow-sm" 
            style={{ backgroundColor: 'hsl(var(--admin-topbar))' }}>
            <button 
              className="lg:hidden text-white/70 hover:text-white"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="font-semibold text-white truncate flex-1 text-sm sm:text-base">{title || 'Admin'}</h1>
            <PWAInstallButton appName="Administrativo" />
          </header>

          <main className="flex-1 p-4 sm:p-6 overflow-x-hidden">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
