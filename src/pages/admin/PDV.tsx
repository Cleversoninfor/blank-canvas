import { useState } from 'react';
import {
  Trash2, ShoppingCart, ArrowLeft, Search, ArrowRight,
  Loader2, Receipt, Package, LockOpen, Lock, KeyRound, ClipboardList,
  Banknote, ArrowDownCircle, Info, DollarSign
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
import { useOpenedSession, useCaixaBalance, useCloseCaixa } from '@/hooks/useCaixa';
import { AbrirCaixaModal } from '@/components/pdv/AbrirCaixaModal';
import { SangriaModal } from '@/components/pdv/SangriaModal';
import { Product } from '@/hooks/useProducts';
import { CloseSaleModal } from '@/components/pdv/CloseSaleModal';
import { ProductSelectorModal } from '@/components/pdv/ProductSelectorModal';
import { CloseComandaCard } from '@/components/pdv/CloseComandaCard';

interface CartItem {
  product: Product;
  quantity: number;
}

const formatCurrency = (v: unknown) => {
  const parsed = typeof v === 'number' ? v : Number(v);
  const safeValue = Number.isFinite(parsed) ? parsed : 0;
  return safeValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const PDV = () => {
  const { toast } = useToast();
  const { data: comandasData, isLoading: loadingComandas } = useComandas();
  const comandas = Array.isArray(comandasData) ? comandasData : [];
  const createOrder = useCreateComandaOrder();
  const updateStatus = useUpdateComandaStatus();
  const { data: activeSession, isLoading: loadingSession } = useOpenedSession();
  const { data: balance } = useCaixaBalance(activeSession?.id);
  const closeCaixa = useCloseCaixa();

  const [view, setView] = useState<'main' | 'select-comanda' | 'select-close'>('main');

  // Modal state
  const [selectorComanda, setSelectorComanda] = useState<Comanda | null>(null);
  const [sangriaOpen, setSangriaOpen] = useState(false);
  const [closeSaleComanda, setCloseSaleComanda] = useState<Comanda | null>(null);

  const livres = comandas.filter(c => c.status === 'livre');
  const ocupadas = comandas.filter(c => c.status === 'ocupada');

  const handleSelectComanda = (comanda: Comanda) => {
    setSelectorComanda(comanda);
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

      if (selectorComanda.status === 'livre') {
        await updateStatus.mutateAsync({ id: selectorComanda.id, status: 'ocupada' });
      }

      toast({
        title: 'Pedido enviado!',
        description: `Itens adicionados na Comanda #${selectorComanda.numero_comanda}.`,
      });
      setSelectorComanda(null);
    } catch (err: any) {
      toast({ title: 'Erro ao enviar pedido', description: err.message, variant: 'destructive' });
      throw err;
    }
  };

  const handleCloseCaixa = async () => {
    if (!activeSession) return;
    if (!confirm('Deseja realmente fechar o caixa?')) return;
    try {
      await closeCaixa.mutateAsync(activeSession.id);
      toast({ title: 'Caixa fechado!', description: 'O caixa foi encerrado com sucesso.' });
    } catch (err: any) {
      toast({ title: 'Erro ao fechar caixa', description: err.message, variant: 'destructive' });
    }
  };

  const renderCurrentView = () => {
    switch (view) {
      case 'select-comanda':
        return (
          <div className="space-y-4">
            <Button variant="ghost" onClick={() => setView('main')}><ArrowLeft className="h-4 w-4 mr-2" /> Voltar ao PDV</Button>
            <h2 className="text-xl font-bold text-foreground">Selecione uma Comanda</h2>
            {loadingComandas ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : comandas.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhuma comanda disponível.</CardContent></Card>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {comandas.map(comanda => {
                  const isLivre = comanda.status === 'livre';
                  return (
                    <Card key={comanda.id} className="cursor-pointer hover:ring-2 hover:ring-primary/40 active:scale-[0.97] transition-all" onClick={() => handleSelectComanda(comanda)}>
                      <CardContent className="p-4 text-center">
                        {isLivre ? <LockOpen className="h-8 w-8 mx-auto mb-2 text-green-500" /> : <Lock className="h-8 w-8 mx-auto mb-2 text-orange-400" />}
                        <p className="font-bold text-lg">#{comanda.numero_comanda}</p>
                        <Badge variant={isLivre ? 'default' : 'secondary'} className="mt-1">{isLivre ? 'Livre' : 'Em uso'}</Badge>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        );

      case 'select-close':
        return (
          <div className="space-y-4">
            <Button variant="ghost" onClick={() => setView('main')}><ArrowLeft className="h-4 w-4 mr-2" /> Voltar ao PDV</Button>
            <h2 className="text-xl font-bold text-foreground">Selecione a Comanda para Fechar</h2>
            {ocupadas.length === 0 ? <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhuma comanda ocupada.</CardContent></Card> : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {ocupadas.map(comanda => (
                  <CloseComandaCard 
                    key={comanda.id} 
                    comanda={comanda} 
                    onClose={() => setCloseSaleComanda(comanda)}
                    onTransfer={() => setView('main')} // Simplificado para admin
                  />
                ))}
              </div>
            )}
          </div>
        );

      default:
        return (
          <div className="space-y-6">
            {activeSession && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card className="bg-white border-none shadow-md overflow-hidden">
                  <div className="p-5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Saldo em Caixa</p>
                      <h3 className="text-2xl font-black text-primary">{formatCurrency(balance?.current)}</h3>
                    </div>
                    <div className="p-3 bg-primary/10 rounded-2xl text-primary"><Banknote className="h-6 w-6" /></div>
                  </div>
                  <div className="px-5 py-3 bg-muted/30 flex justify-between text-[10px] font-bold text-muted-foreground uppercase">
                    <span>Inicial: {formatCurrency(balance?.initial)}</span>
                    <span className="text-green-600">Entradas: {formatCurrency(balance?.entradas)}</span>
                    <span className="text-red-500">Sangrias: {formatCurrency(balance?.saidas)}</span>
                  </div>
                </Card>
                <div className="flex gap-4 md:col-span-2">
                  <Button variant="outline" className="h-full flex-1 border-dashed border-2 p-6 bg-white" onClick={() => setSangriaOpen(true)}><ArrowDownCircle className="h-6 w-6 mr-2" /> Realizar Sangria</Button>
                  <Button variant="outline" className="h-full flex-1 border-dashed border-2 p-6 bg-white" onClick={handleCloseCaixa} disabled={closeCaixa.isPending}><Info className="h-6 w-6 mr-2" /> Fechar Caixa</Button>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card><CardHeader><CardTitle className="flex items-center gap-2"><ShoppingCart className="h-5 w-5" /> Abrir Venda</CardTitle></CardHeader>
                <CardContent className="space-y-3"><Button onClick={() => setView('select-comanda')} className="w-full" size="lg" disabled={comandas.length === 0}><Package className="h-4 w-4 mr-2" /> Selecionar Comanda</Button>
                  <p className="text-xs text-muted-foreground text-center">{comandas.length === 0 ? 'Nenhuma comanda disponível' : `${livres.length} livre(s) · ${ocupadas.length} em uso`}</p>
                </CardContent>
              </Card>
              <Card><CardHeader><CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" /> Fechar Venda</CardTitle></CardHeader>
                <CardContent className="space-y-3"><Button onClick={() => setView('select-close')} className="w-full" size="lg" variant="destructive" disabled={ocupadas.length === 0}><DollarSign className="h-4 w-4 mr-2" /> Fechar Venda</Button>
                  <p className="text-xs text-muted-foreground text-center">{ocupadas.length === 0 ? 'Nenhuma comanda ocupada' : `${ocupadas.length} comanda(s) ocupada(s)`}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        );
    }
  };

  return (
    <AdminLayout title="PDV">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-black text-foreground tracking-tight">{view === 'main' ? 'PDV' : view === 'select-comanda' ? 'Abrir Venda' : 'Fechar Venda'}</h1>
          <p className="text-muted-foreground mt-2 font-medium">Gestão administrativa de PDV e Caixa.</p>
        </div>
      </div>

      {renderCurrentView()}

      <AbrirCaixaModal open={!loadingSession && !activeSession} />
      {activeSession && (
        <SangriaModal open={sangriaOpen} onClose={() => setSangriaOpen(false)} sessionId={activeSession.id} />
      )}
      {closeSaleComanda && (
        <CloseSaleModal comanda={closeSaleComanda} open={!!closeSaleComanda} onClose={() => { setCloseSaleComanda(null); setView('main'); }} />
      )}
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
};

export default PDV;
