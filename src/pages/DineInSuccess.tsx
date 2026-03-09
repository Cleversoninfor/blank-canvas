import { useLocation, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { CheckCircle, UtensilsCrossed, Home, Clock } from 'lucide-react';
import { useStoreConfig } from '@/hooks/useStore';

const DineInSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: store } = useStoreConfig();
  
  const { tableNumber, tableName, orderId } = (location.state as {
    tableNumber?: number;
    tableName?: string | null;
    orderId?: number;
  }) || {};

  return (
    <>
      <Helmet>
        <title>Pedido Enviado - {store?.name || 'Delivery'}</title>
      </Helmet>

      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full space-y-6">
          {/* Success Icon */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-24 h-24 bg-secondary/20 rounded-full flex items-center justify-center animate-pulse">
                <CheckCircle className="h-16 w-16 text-secondary" />
              </div>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">
              🎉 Pedido Enviado!
            </h1>
            <p className="text-muted-foreground">
              Seu pedido foi recebido e está sendo preparado.
            </p>
          </div>

          {/* Table Info */}
          {tableNumber && (
            <div className="bg-card rounded-2xl p-6 shadow-card space-y-4">
              <div className="flex items-center justify-center gap-3">
                <UtensilsCrossed className="h-6 w-6 text-primary" />
                <span className="text-lg font-semibold text-foreground">Sua Mesa</span>
              </div>
              
              <div className="flex flex-col items-center gap-2">
                <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center">
                  <span className="text-4xl font-bold text-primary-foreground">
                    {tableNumber}
                  </span>
                </div>
                {tableName && (
                  <p className="text-sm text-muted-foreground">{tableName}</p>
                )}
              </div>

              {orderId && (
                <p className="text-sm text-muted-foreground">
                  Pedido #{orderId}
                </p>
              )}
            </div>
          )}

          {/* Instructions */}
          <div className="bg-muted/50 rounded-xl p-4 space-y-2">
            <p className="text-sm text-foreground font-medium">
              📍 Aguarde em sua mesa
            </p>
            <p className="text-sm text-muted-foreground">
              Seu pedido será entregue em breve. O pagamento será realizado ao final do consumo.
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            {orderId && (
              <Button
                onClick={() => navigate(`/dine-in-order/${orderId}`)}
                size="lg"
                className="w-full rounded-full"
              >
                <Clock className="h-4 w-4 mr-2" />
                Acompanhar Pedido
              </Button>
            )}
            <Button
              onClick={() => navigate('/')}
              size="lg"
              variant="outline"
              className="w-full rounded-full"
            >
              <Home className="h-4 w-4 mr-2" />
              Voltar ao Cardápio
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default DineInSuccess;
