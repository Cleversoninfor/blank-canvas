import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { UserCheck, Loader2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PWAInstallButton } from '@/components/pwa/PWAInstallButton';
import { useStoreConfig } from '@/hooks/useStore';
import { useTheme } from '@/hooks/useTheme';
import { usePWAConfig } from '@/hooks/usePWAConfig';
import { supabase } from '@/integrations/supabase/client';

interface Waiter {
  id: string;
  name: string;
  phone: string | null;
  is_active: boolean;
}

export default function WaiterAccess() {
  const navigate = useNavigate();
  const { data: store } = useStoreConfig();
  const [waiters, setWaiters] = useState<Waiter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedWaiter, setSelectedWaiter] = useState<string | null>(null);

  useTheme();
  usePWAConfig();

  useEffect(() => {
    loadWaiters();
  }, []);

  const loadWaiters = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('waiters')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (!error && data) {
      setWaiters(data);
    }
    setIsLoading(false);
  };

  const handleSelectWaiter = (waiterId: string, waiterName: string) => {
    setSelectedWaiter(waiterId);
    // Store waiter info in localStorage
    localStorage.setItem('waiter_id', waiterId);
    localStorage.setItem('waiter_name', waiterName);
    
    // Navigate to dashboard
    setTimeout(() => {
      navigate('/waiter/dashboard');
    }, 300);
  };

  return (
    <>
      <Helmet>
        <title>{`Acesso Garçom - ${store?.name || 'Restaurante'}`}</title>
      </Helmet>

      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        {/* PWA Install Button - Fixed Position */}
        <div className="fixed top-4 right-4 z-50">
          <PWAInstallButton appName="Garçons" />
        </div>

        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              {store?.logo_url ? (
                <img 
                  src={store.logo_url} 
                  alt="Logo" 
                  className="h-12 w-12 object-contain rounded-full"
                />
              ) : (
                <UserCheck className="h-8 w-8 text-primary" />
              )}
            </div>
            <CardTitle className="text-2xl">Olá, Garçom!</CardTitle>
            <CardDescription>
              Selecione seu nome para acessar o sistema
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : waiters.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  Nenhum garçom cadastrado ainda.
                </p>
                <Button variant="outline" onClick={() => navigate('/')}>
                  Voltar ao cardápio
                </Button>
              </div>
            ) : (
              <div className="grid gap-3">
                {waiters.map((waiter) => (
                  <Button
                    key={waiter.id}
                    variant={selectedWaiter === waiter.id ? 'default' : 'outline'}
                    className="w-full h-14 text-lg justify-start px-4"
                    onClick={() => handleSelectWaiter(waiter.id, waiter.name)}
                    disabled={selectedWaiter !== null}
                  >
                    {selectedWaiter === waiter.id ? (
                      <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                    ) : (
                      <UserCheck className="h-5 w-5 mr-3" />
                    )}
                    {waiter.name}
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
