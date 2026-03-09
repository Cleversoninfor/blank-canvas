import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Truck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PWAInstallButton } from '@/components/pwa/PWAInstallButton';
import { useStoreConfig } from '@/hooks/useStore';
import { useTheme } from '@/hooks/useTheme';
import { usePWAConfig } from '@/hooks/usePWAConfig';
import { supabase } from '@/integrations/supabase/client';

interface Driver {
  id: string;
  name: string;
  phone: string | null;
  is_active: boolean;
}

export default function DriverAccess() {
  const navigate = useNavigate();
  const { data: store } = useStoreConfig();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);

  useTheme();
  usePWAConfig();

  useEffect(() => {
    loadDrivers();
  }, []);

  const loadDrivers = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('drivers')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (!error && data) {
      setDrivers(data);
    }
    setIsLoading(false);
  };

  const handleSelectDriver = (driverId: string, driverName: string) => {
    setSelectedDriver(driverId);
    localStorage.setItem('driver_id', driverId);
    localStorage.setItem('driver_name', driverName);
    setTimeout(() => navigate('/driver/dashboard'), 300);
  };

  return (
    <>
      <Helmet>
        <title>{`Acesso Entregador - ${store?.name || 'Restaurante'}`}</title>
      </Helmet>

      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="fixed top-4 right-4 z-50">
          <PWAInstallButton appName="Entregas" />
        </div>

        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              {store?.logo_url ? (
                <img src={store.logo_url} alt="Logo" className="h-12 w-12 object-contain rounded-full" />
              ) : (
                <Truck className="h-8 w-8 text-primary" />
              )}
            </div>
            <CardTitle className="text-2xl">Olá, Entregador!</CardTitle>
            <CardDescription>Selecione seu nome para acessar suas entregas</CardDescription>
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : drivers.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">Nenhum entregador cadastrado ainda.</p>
                <Button variant="outline" onClick={() => navigate('/')}>
                  Voltar ao cardápio
                </Button>
              </div>
            ) : (
              <div className="grid gap-3">
                {drivers.map((driver) => (
                  <Button
                    key={driver.id}
                    variant={selectedDriver === driver.id ? 'default' : 'outline'}
                    className="w-full h-14 text-lg justify-start px-4"
                    onClick={() => handleSelectDriver(driver.id, driver.name)}
                    disabled={selectedDriver !== null}
                  >
                    {selectedDriver === driver.id ? (
                      <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                    ) : (
                      <Truck className="h-5 w-5 mr-3" />
                    )}
                    {driver.name}
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
