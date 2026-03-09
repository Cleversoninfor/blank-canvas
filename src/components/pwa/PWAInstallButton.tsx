import { useState } from 'react';
import { Download, X, Share, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWAInstall } from '@/hooks/usePWAInstall';

interface PWAInstallButtonProps {
  appName?: string;
}

const PWAInstallButton = ({ appName = 'App' }: PWAInstallButtonProps) => {
  const { isInstallable, isInstalled, promptInstall, isIOS, showIOSInstructions } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  // Don't show if already installed or dismissed
  if (isInstalled || dismissed) return null;

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
    } else if (isInstallable) {
      await promptInstall();
    } else {
      // Show instructions for browsers that don't support beforeinstallprompt
      setShowIOSModal(true);
    }
  };

  return (
    <>
      {/* Install Button in Header */}
      <div className="relative">
        <Button
          onClick={handleInstallClick}
          variant="outline"
          size="sm"
          className="gap-2"
          title={`Instalar ${appName}`}
        >
          <Download className="h-4 w-4" />
          <span>Instalar</span>
        </Button>
        <button
          onClick={() => setDismissed(true)}
          className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center shadow-sm"
        >
          <X className="h-2.5 w-2.5" />
        </button>
      </div>

      {/* Install Instructions Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card rounded-2xl p-6 max-w-sm w-full shadow-xl animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Instalar {appName}</h3>
              <button
                onClick={() => setShowIOSModal(false)}
                className="h-8 w-8 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="space-y-4">
              {isIOS ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Para instalar o app no seu iPhone ou iPad:
                  </p>
                  
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Share className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">1. Toque em Compartilhar</p>
                        <p className="text-xs text-muted-foreground">
                          Na barra do Safari, toque no ícone de compartilhar
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Plus className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">2. Adicionar à Tela de Início</p>
                        <p className="text-xs text-muted-foreground">
                          Role para baixo e toque em "Adicionar à Tela de Início"
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Para instalar o app no seu dispositivo:
                  </p>
                  
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Download className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Chrome / Edge</p>
                        <p className="text-xs text-muted-foreground">
                          Toque no menu (⋮) e selecione "Instalar app" ou "Adicionar à tela inicial"
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Share className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Samsung Internet</p>
                        <p className="text-xs text-muted-foreground">
                          Toque no menu e selecione "Adicionar à Tela inicial"
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
              
              <Button
                onClick={() => setShowIOSModal(false)}
                className="w-full"
              >
                Entendi
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export { PWAInstallButton };
