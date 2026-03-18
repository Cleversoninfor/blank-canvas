import { useState } from 'react';
import {
  ShoppingCart, ArrowLeft,
  Loader2, Receipt, Package, DollarSign, LockOpen, Lock,
} from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  useComandas,
  useCreateComandaOrder, useUpdateComandaStatus, Comanda,
} from '@/hooks/useComandas';
import { Product } from '@/hooks/useProducts';
import { CloseSaleModal } from '@/components/pdv/CloseSaleModal';
import { ProductSelectorModal } from '@/components/pdv/ProductSelectorModal';

interface CartItem {
  product: Product;
  quantity: number;
}

const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const PDV = () => {
  const { toast } = useToast();
  const { data: comandas = [], isLoading: loadingComandas } = useComandas();
  const createOrder = useCreateComandaOrder();
  const updateStatus = useUpdateComandaStatus();

  const [view, setView] = useState<'main' | 'select-comanda' | 'select-close'>('main');

  // Modal state
  const [selectorComanda, setSelectorComanda] = useState<Comanda | null>(null);
  const [closeSaleComanda, setCloseSaleComanda] = useState<Comanda | null>(null);

  const livres = comandas.filter(c => c.status === 'livre');
  const ocupadas = comandas.filter(c => c.status === 'ocupada');


  // Open product selector modal immediately, mark as ocupada in background
  const handleSelectComanda = (comanda: Comanda) => {
    setSelectorComanda(comanda);
    if (comanda.status === 'livre') {
      updateStatus.mutateAsync({ id: comanda.id, status: 'ocupada' }).catch((err: any) => {
        toast({ title: 'Aviso', description: 'Não foi possível atualizar status: ' + err.message, variant: 'destructive' });
      });
    }
  };

  const handleSelectorConfirm = async (items: CartItem[]) => {
    if (!selectorComanda) return;
    try {
      await createOrder.mutateAsync({
        comandaId: selectorComanda.id,
        numeroComanda: selectorComanda.numero_comanda,
        items: items.map(i => ({
          product_name: i.product.name,
          quantity: i.quantity,
          unit_price: i.product.price,
        })),
      });
      toast({
        title: '✅ Pedido enviado!',
        description: `${items.reduce((s, i) => s + i.quantity, 0)} item(s) enviados para a cozinha — Comanda #${selectorComanda.numero_comanda}.`,
      });
      setSelectorComanda(null);
    } catch (err: any) {
      toast({ title: 'Erro ao enviar pedido', description: err.message, variant: 'destructive' });
      throw err; // Keep modal open on error
    }
  };

  // === SELECT COMANDA FOR OPENING SALE ===
  if (view === 'select-comanda') {
    return (
      <AdminLayout title="PDV - Abrir Venda">
        <div className="space-y-4">
          <Button variant="ghost" onClick={() => setView('main')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao PDV
          </Button>

          <h2 className="text-xl font-bold text-foreground">Selecione uma Comanda</h2>

          {loadingComandas ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : comandas.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhuma comanda disponível. Crie uma comanda primeiro.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {comandas.map(comanda => {
                const isLivre = comanda.status === 'livre';
                return (
                  <Card
                    key={comanda.id}
                    className="cursor-pointer hover:ring-2 hover:ring-primary/40 active:scale-[0.97] transition-all"
                    onClick={() => handleSelectComanda(comanda)}
                  >
                    <CardContent className="p-4 text-center">
                      {isLivre ? (
                        <LockOpen className="h-8 w-8 mx-auto mb-2 text-green-500" />
                      ) : (
                        <Lock className="h-8 w-8 mx-auto mb-2 text-orange-400" />
                      )}
                      <p className="font-bold text-lg">#{comanda.numero_comanda}</p>
                      <Badge variant={isLivre ? 'default' : 'secondary'} className="mt-1">
                        {isLivre ? 'Livre' : 'Em uso'}
                      </Badge>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Product Selector Modal */}
        {selectorComanda && (
          <ProductSelectorModal
            open={!!selectorComanda}
            comandaNumero={selectorComanda.numero_comanda}
            onClose={() => setSelectorComanda(null)}
            onConfirm={handleSelectorConfirm}
            isLoading={createOrder.isPending}
          />
        )}
      </AdminLayout>
    );
  }

  // === SELECT COMANDA FOR CLOSING SALE ===
  if (view === 'select-close') {
    return (
      <AdminLayout title="PDV - Fechar Venda">
        <div className="space-y-4">
          <Button variant="ghost" onClick={() => setView('main')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao PDV
          </Button>

          <h2 className="text-xl font-bold text-foreground">Selecione a Comanda para Fechar</h2>

          {ocupadas.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhuma comanda ocupada no momento.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {ocupadas.map(comanda => (
                <Card
                  key={comanda.id}
                  className="cursor-pointer hover:ring-2 hover:ring-destructive/30 transition-all active:scale-[0.97]"
                  onClick={() => setCloseSaleComanda(comanda)}
                >
                  <CardContent className="p-4 text-center">
                    <Lock className="h-8 w-8 mx-auto mb-2 text-destructive" />
                    <p className="font-bold text-lg">Comanda #{comanda.numero_comanda}</p>
                    <Badge variant="destructive" className="mt-1">Ocupada</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {closeSaleComanda && (
            <CloseSaleModal
              comanda={closeSaleComanda}
              open={!!closeSaleComanda}
              onClose={() => {
                setCloseSaleComanda(null);
                setView('main');
              }}
            />
          )}
        </div>
      </AdminLayout>
    );
  }

  // === MAIN PDV VIEW ===
  return (
    <AdminLayout title="PDV">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Abrir Venda */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Abrir Venda
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={() => setView('select-comanda')}
                className="w-full"
                size="lg"
                disabled={comandas.length === 0}
              >
                <Package className="h-4 w-4 mr-2" />
                Selecionar Comanda
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                {comandas.length === 0
                  ? 'Nenhuma comanda disponível'
                  : `${livres.length} livre(s) · ${ocupadas.length} em uso`
                }
              </p>
            </CardContent>
          </Card>

          {/* Fechar Venda */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Fechar Venda
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={() => setView('select-close')}
                className="w-full"
                size="lg"
                variant="destructive"
                disabled={ocupadas.length === 0}
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Fechar Venda
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                {ocupadas.length === 0 ? 'Nenhuma comanda ocupada' : `${ocupadas.length} comanda(s) ocupada(s)`}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default PDV;
