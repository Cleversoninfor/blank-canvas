import { Helmet } from 'react-helmet-async';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';
import { useStoreConfig } from '@/hooks/useStore';
import { useTheme } from '@/hooks/useTheme';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Install() {
  const { data: store } = useStoreConfig();

  // Ensure theme + PWA metadata are applied on this page before installing
  useTheme();

  const appName = store?.pwa_name || store?.name || 'Cardápio';
  const shortName = store?.pwa_short_name || store?.pwa_name?.slice(0, 12) || store?.name?.slice(0, 12) || 'Cardápio';

  return (
    <>
      <Helmet>
        <title>Instalar - {appName}</title>
        <meta
          name="description"
          content={`Instale ${appName} no seu celular para acessar mais rápido.`}
        />
        <link rel="canonical" href="/install" />
      </Helmet>

      <main className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Instalar {shortName}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Esta página prepara o ícone e os nomes do app para que a instalação use exatamente o que
              foi configurado no painel.
            </p>
            <p className="text-sm text-muted-foreground">
              Se você já instalou antes, desinstale o app e instale novamente.
            </p>
          </CardContent>
        </Card>

        <InstallPrompt />
      </main>
    </>
  );
}
