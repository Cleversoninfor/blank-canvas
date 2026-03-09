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

// Menu organizado por grupos lógicos
const navGroups = [
  {
    label: 'Operações',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
      { id: 'pdv', label: 'PDV', icon: Store, path: '/admin/pdv' },
      { id: 'kitchen', label: 'Cozinha', icon: ChefHat, path: '/kitchen', external: true },
      { id: 'waiters', label: 'Garçons', icon: Users, path: '/admin/waiters' },
      { id: 'waiter-access', label: 'Acesso Garçons', icon: Users, path: '/waiter', external: true },
      { id: 'drivers', label: 'Entregadores', icon: Truck, path: '/admin/drivers' },
      { id: 'driver-access', label: 'Acesso Entregadores', icon: Truck, path: '/driver', external: true },
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

  // Apply dynamic theme and PWA config based on store colors
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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!isAdmin) {
    return (
      <>
        <Helmet>
          <title>Acesso negado - {store?.name || 'Admin'}</title>
        </Helmet>

        <main className="min-h-screen bg-background flex items-center justify-center p-6">
          <Card className="w-full max-w-md">
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
                    toast({
                      title: 'Permissões atualizadas',
                      description: 'Se você for admin, o painel vai liberar automaticamente.',
                    });
                  }}
                >
                  Atualizar permissões
                </Button>
                <Button variant="outline" onClick={handleSignOut}>
                  Sair e entrar novamente
                </Button>
                <Button variant="ghost" onClick={() => navigate('/')}>
                  Voltar ao cardápio
                </Button>
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

      {/* Global Order Notification */}
      <GlobalOrderNotification />

      {/* Infornexa Header */}
      <InfornexaHeader />

      <div className="min-h-screen bg-background flex">
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 z-40 bg-foreground/60 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-300 lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <div className="flex flex-col h-full">
            {/* Sidebar Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center overflow-hidden">
                  {store?.logo_url ? (
                    <img 
                      src={store.logo_url} 
                      alt={`Logo ${store?.name || 'Admin'}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-xl">🍔</span>
                  )}
                </div>
                <div>
                  <p className="font-bold text-foreground text-sm">{store?.name || 'Admin'}</p>
                  <Badge variant={storeStatus.isOpen ? 'open' : 'closed'} className="text-xs">
                    {storeStatus.isOpen ? 'Aberto' : 'Fechado'}
                  </Badge>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="lg:hidden"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-4 overflow-y-auto">
              {navGroups.map((group) => (
                <div key={group.label}>
                  <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                    {group.label}
                  </p>
                  <div className="space-y-1">
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
                            "flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                            isActive 
                              ? "bg-primary text-primary-foreground" 
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                        >
                          <item.icon className="h-5 w-5" />
                          <span className="flex-1 text-left">{item.label}</span>
                          {item.external && <ExternalLink className="h-3.5 w-3.5 opacity-50" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>

            {/* User Section */}
            <div className="p-4 border-t border-border">
              {/* PWA Install Button for Desktop */}
              <div className="hidden lg:block mb-3">
                <PWAInstallButton appName="Administração" />
              </div>
              
              <div className="flex items-center gap-3 mb-3">
                <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-sm font-medium text-foreground">
                    {user.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {user.user_metadata?.name || user.email}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isAdmin ? 'Administrador' : 'Usuário'}
                  </p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-h-screen min-w-0 overflow-x-hidden">
          {/* Mobile Header */}
          <header className="sticky top-0 z-30 flex items-center gap-3 bg-card px-4 py-3 border-b border-border lg:hidden">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="font-bold text-foreground truncate flex-1">{title || 'Admin'}</h1>
            <PWAInstallButton appName="Administração" />
          </header>

          {/* Content */}
          <main className="flex-1 p-3 sm:p-4 lg:p-6 overflow-x-hidden">
            {/* Desktop: keep install button visible without needing to find it in the sidebar */}
            <div className="hidden lg:flex justify-end mb-4">
              <PWAInstallButton appName="Administração" />
            </div>
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
