import { ReactNode, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  Store,
  LayoutDashboard,
  Users,
  ClipboardList,
  PlusCircle,
  ExternalLink,
  Eye,
  MapPin,
  BarChart3,
  DatabaseBackup,
  QrCode,
  Truck
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
import { usePWAConfig } from '@/hooks/usePWAConfig';
import { cn } from '@/lib/utils';
import { GlobalOrderNotification } from './GlobalOrderNotification';
import { InfornexaHeader } from './InfornexaHeader';

interface AdminLayoutProps {
  children: ReactNode;
  title?: string;
}

const navGroups = [
  {
    label: 'Operações',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
      { id: 'pdv', label: 'PDV', icon: Store, path: '/admin/pdv' },
      { id: 'kitchen', label: 'Cozinha', icon: ChefHat, path: '/kitchen', external: true },
      { id: 'waiters', label: 'Garçons', icon: Users, path: '/admin/waiters' },
      { id: 'drivers', label: 'Entregadores', icon: Truck, path: '/admin/drivers' },
    ]
  },
  {
    label: 'Gestão',
    items: [
      { id: 'orders', label: 'Pedidos', icon: ClipboardList, path: '/admin/orders' },
      { id: 'products', label: 'Produtos', icon: ShoppingBag, path: '/admin/products' },
      { id: 'categories', label: 'Categorias', icon: Tag, path: '/admin/categories' },
      { id: 'addons', label: 'Acréscimos', icon: PlusCircle, path: '/admin/addons' },
      { id: 'coupons', label: 'Cupons', icon: Ticket, path: '/admin/coupons' },
      { id: 'reports', label: 'Relatórios', icon: BarChart3, path: '/admin/reports' },
      { id: 'driver-reports', label: 'Relatório Entregadores', icon: Truck, path: '/admin/driver-reports' },
      { id: 'waiter-reports', label: 'Relatório Garçons', icon: Users, path: '/admin/waiter-reports' },
    ]
  },
  {
    label: 'Sistema',
    items: [
      { id: 'delivery-zones', label: 'Taxas de Entrega', icon: MapPin, path: '/admin/delivery-zones' },
      { id: 'hours', label: 'Horários', icon: Clock, path: '/admin/hours' },
      { id: 'settings', label: 'Configurações', icon: Settings, path: '/admin/settings' },
      { id: 'qrcodes', label: 'QR Codes', icon: QrCode, path: '/admin/qrcodes' },
      { id: 'backup', label: 'Backup', icon: DatabaseBackup, path: '/admin/backup' },
    ]
  },
  {
    label: 'Visualizar',
    items: [
      { id: 'menu', label: 'Ver Cardápio', icon: Eye, path: '/', external: true },
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
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 lg:translate-x-0 flex flex-col",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )} style={{ backgroundColor: 'hsl(var(--sidebar-background))' }}>
          {/* Sidebar Header */}
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

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-4 overflow-y-auto scrollbar-hide">
            {navGroups.map((group) => (
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

          {/* User Section */}
          <div className="p-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
            <div className="hidden lg:block mb-3">
              <PWAInstallButton appName="Administração" />
            </div>
            
            <div className="flex items-center gap-3 mb-3">
              <div className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center">
                <span className="text-sm font-medium text-white">
                  {user.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user.user_metadata?.name || user.email}
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

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-h-screen min-w-0 overflow-x-hidden">
          {/* Top Bar */}
          <header className="sticky top-0 z-30 flex items-center gap-3 px-4 sm:px-6 py-3 shadow-sm" 
            style={{ backgroundColor: 'hsl(var(--admin-topbar))' }}>
            <button 
              className="lg:hidden text-white/70 hover:text-white"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="font-semibold text-white truncate flex-1 text-sm sm:text-base">{title || 'Admin'}</h1>
            <PWAInstallButton appName="Administração" />
          </header>

          {/* Content */}
          <main className="flex-1 p-4 sm:p-6 overflow-x-hidden">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
