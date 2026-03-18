import { useState } from 'react';
import {
  Trash2, ShoppingCart, ArrowLeft, Search, ArrowRight,
  Loader2, Receipt, Package, LockOpen, Lock, KeyRound, ClipboardList,
  Banknote, ArrowDownCircle, Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  useComandas,
  useCreateComandaOrder, useUpdateComandaStatus, Comanda,
} from '@/hooks/useComandas';
import { useProducts, Product } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { useOpenedSession, useCaixaBalance, useCloseCaixa } from '@/hooks/useCaixa';
import { AbrirCaixaModal } from '@/components/pdv/AbrirCaixaModal';
import { SangriaModal } from '@/components/pdv/SangriaModal';
import { CloseSaleModal } from '@/components/pdv/CloseSaleModal';
import { ProductSelectorModal } from '@/components/pdv/ProductSelectorModal';
import { ComandaConsumoCard } from '@/components/pdv/ComandaConsumoCard';
import { TransferComandaModal } from '@/components/pdv/TransferComandaModal';
import { CloseComandaCard } from '@/components/pdv/CloseComandaCard';
import { useStoreConfig } from '@/hooks/useStore';
import { useTheme } from '@/hooks/useTheme';

type PDVView = 'main' | 'select-comanda' | 'venda' | 'select-close' | 'consumo';

interface CartItem {
  product: Product;
  quantity: number;
  observation?: string;
}

const formatCurrency = (v: unknown) => {
  const parsed = typeof v === 'number' ? v : Number(v);
  const safeValue = Number.isFinite(parsed) ? parsed : 0;
  return safeValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const PDVHeader = ({ title, onLogout }: { title: string; onLogout: () => void }) => (
  <div className="sticky top-0 z-50 flex items-center gap-4 px-6 sm:px-10 py-5 bg-primary/95 backdrop-blur-md text-primary-foreground shadow-lg mb-8 -mx-4 sm:-mx-6 -mt-4 sm:-mt-6 rounded-b-[2rem]">
    <div className="bg-white/20 p-2 rounded-xl">
      <Receipt className="h-6 w-6" />
    </div>
    <h1 className="font-bold text-lg sm:text-xl flex-1 tracking-tight">{title}</h1>
    <Button 
      variant="ghost" 
      size="sm" 
      className="text-primary-foreground hover:bg-white/20 transition-colors" 
      onClick={onLogout}
    >
      Sair
    </Button>
  </div>
);

const PDVPublic = () => {
  const { toast } = useToast();
  const { data: store, isLoading: loadingStore } = useStoreConfig();
  const [authenticated, setAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useTheme();

  // PDV state
  const { data: comandasData, isLoading: loadingComandas } = useComandas();
  const comandas = Array.isArray(comandasData) ? comandasData : [];
  
  const { data: productsData, isLoading: loadingProducts, error: productsError } = useProducts();
  const products = Array.isArray(productsData) ? productsData : [];
  
  const { data: categoriesData, isLoading: loadingCategories } = useCategories();
  const categories = Array.isArray(categoriesData) ? categoriesData : [];
  
  const createOrder = useCreateComandaOrder();
  const { data: activeSession, isLoading: loadingSession } = useOpenedSession();
  const { data: balanceData } = useCaixaBalance(activeSession?.id);
  const balance = balanceData || { current: 0, initial: 0, entradas: 0, saidas: 0 };
  const closeCaixa = useCloseCaixa();
  const updateStatus = useUpdateComandaStatus();

  const [view, setView] = useState<PDVView>('main');
  const [selectedComanda, setSelectedComanda] = useState<Comanda | null>(null);
  const [selectorComanda, setSelectorComanda] = useState<Comanda | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [closeSaleComanda, setCloseSaleComanda] = useState<Comanda | null>(null);
  const [transferSourceComanda, setTransferSourceComanda] = useState<Comanda | null>(null);
  const [sangriaOpen, setSangriaOpen] = useState(false);

  const livres = comandas.filter(c => c.status === 'livre');
  const ocupadas = comandas.filter(c => c.status === 'ocupada');

  const handleLogin = () => {
    if (!store?.pdv_password) {
      setPasswordError('Senha do PDV não configurada.');
      return;
    }
    if (passwordInput === store.pdv_password) {
      setAuthenticated(true);
      setPasswordError('');
    } else {
      setPasswordError('Senha do PDV incorreta.');
    }
  };

  const handleSelectComanda = (comanda: Comanda) => {
    setSelectedComanda(comanda);
    setView('venda');
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(i => i.product.id !== productId));
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.product.id !== productId) return i;
      const newQty = i.quantity + delta;
      return newQty <= 0 ? i : { ...i, quantity: newQty };
    }).filter(i => i.quantity > 0));
  };

  const cartTotal = cart.reduce((sum, i) => sum + Number(i.product.price || 0) * i.quantity, 0);

  const handleFinalizarPedido = async () => {
    if (!selectedComanda || cart.length === 0) return;
    try {
      await createOrder.mutateAsync({
        comandaId: selectedComanda.id,
        numeroComanda: selectedComanda.numero_comanda,
        items: cart.map(i => ({
          product_name: i.product.name,
          quantity: i.quantity,
          unit_price: Number(i.product.price || 0),
          observation: i.observation,
        })),
      });

      if (selectedComanda.status === 'livre') {
        await updateStatus.mutateAsync({ id: selectedComanda.id, status: 'ocupada' });
      }

      toast({ title: 'Pedido enviado!', description: `Pedido da Comanda #${selectedComanda.numero_comanda} enviado para a cozinha.` });
      setCart([]);
    } catch (err: any) {
      toast({ title: 'Erro ao criar pedido', description: err.message, variant: 'destructive' });
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

  const availableProducts = products.filter(p => Boolean(p?.is_available));
  const filteredProducts = availableProducts.filter(p => {
    const productName = String(p?.name ?? '').toLowerCase();
    const matchesSearch = !searchTerm || productName.includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || p?.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const renderProductsGrid = () => {
    if (loadingProducts || loadingCategories) return <div className="col-span-full flex justify-center py-8"><Loader2 className="animate-spin text-primary" /></div>;
    if (productsError) return <p className="col-span-full text-center text-destructive py-8">Erro ao carregar produtos.</p>;
    if (filteredProducts.length === 0) return <p className="col-span-full text-center text-muted-foreground py-8">Nenhum produto encontrado</p>;
    return filteredProducts.map(product => (
      <Card key={product.id} className="cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all active:scale-[0.97]" onClick={() => addToCart(product)}>
        <CardContent className="p-3 space-y-2">
          {product.image_url && <img src={product.image_url} alt={product.name} className="w-full h-24 object-cover rounded-lg" />}
          <p className="font-semibold text-sm text-foreground line-clamp-1">{product.name}</p>
          <p className="text-sm font-bold text-primary">{formatCurrency(product.price)}</p>
        </CardContent>
      </Card>
    ));
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F1F5F9] p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4"><KeyRound className="h-8 w-8 text-primary" /></div>
            <CardTitle>Acesso ao PDV</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input type="password" placeholder="Senha do PDV" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} />
            {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
            <Button className="w-full" size="lg" onClick={handleLogin}>Entrar</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderCurrentView = () => {
    switch (view) {
      case 'venda':
        if (!selectedComanda) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;
        return (
          <div className="space-y-4">
            <PDVHeader title={`Comanda #${selectedComanda.numero_comanda}`} onLogout={() => setAuthenticated(false)} />
            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={() => { setView('main'); setSelectedComanda(null); setCart([]); }}><ArrowLeft className="h-4 w-4 mr-2" /> Voltar</Button>
              <Button variant="destructive" onClick={() => setCloseSaleComanda(selectedComanda)}>Fechar Venda</Button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar produto..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant={selectedCategory === null ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setSelectedCategory(null)}>Todos</Badge>
                  {categories.map(cat => (
                    <Badge key={cat.id} variant={selectedCategory === cat.id ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setSelectedCategory(cat.id)}>{cat.name}</Badge>
                  ))}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">{renderProductsGrid()}</div>
              </div>
              <div className="lg:col-span-1">
                <Card className="sticky top-24 border-none shadow-xl">
                  <CardHeader className="bg-primary/5 pb-2"><CardTitle className="text-lg flex items-center gap-2 font-bold"><ShoppingCart className="h-5 w-5" /> Carrinho</CardTitle></CardHeader>
                  <CardContent className="space-y-4 p-5">
                    {cart.map(item => (
                      <div key={item.product.id} className="flex items-center justify-between text-sm">
                        <span className="truncate flex-1 font-medium">{item.product.name}</span>
                        <div className="flex items-center gap-1 mx-3 bg-muted px-2 py-0.5 rounded-lg font-bold">
                          <button onClick={() => updateQuantity(item.product.id, -1)} className="px-1">−</button>
                          <span>{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.product.id, 1)} className="px-1">+</button>
                        </div>
                        <span className="font-bold text-primary">{formatCurrency(item.product.price * item.quantity)}</span>
                        <button onClick={() => removeFromCart(item.product.id)} className="ml-3 text-destructive hover:scale-110 transition-transform"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    ))}
                    <div className="border-t pt-4">
                      <div className="flex justify-between items-center mb-5"><span className="text-muted-foreground font-semibold">Total</span><span className="text-2xl font-black text-primary">{formatCurrency(cartTotal)}</span></div>
                      <Button className="w-full h-12 text-lg font-bold" onClick={handleFinalizarPedido} disabled={createOrder.isPending || cart.length === 0}>Enviar Pedido</Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        );
      case 'select-comanda':
        return (
          <div className="space-y-6">
            <PDVHeader title="Abrir Venda" onLogout={() => setAuthenticated(false)} />
            <Button variant="ghost" onClick={() => setView('main')}><ArrowLeft className="h-4 w-4 mr-2" /> Voltar</Button>
            <h2 className="text-xl font-bold">Selecione uma Comanda Livre</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-6">
              {livres.map(c => (
                <Card key={c.id} className="cursor-pointer hover:ring-4 hover:ring-primary/20 transition-all p-2" onClick={() => handleSelectComanda(c)}>
                  <CardContent className="p-6 text-center">
                    <div className="bg-green-100 p-3 rounded-full w-fit mx-auto mb-4 text-green-600"><LockOpen className="h-6 w-6" /></div>
                    <p className="font-bold text-xl">#{c.numero_comanda}</p>
                    <Badge variant="default" className="mt-2">Livre</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      case 'consumo':
        return (
          <div className="space-y-6">
            <PDVHeader title="Consumo" onLogout={() => setAuthenticated(false)} />
            <Button variant="ghost" onClick={() => setView('main')}><ArrowLeft className="h-4 w-4 mr-2" /> Voltar</Button>
            <h2 className="text-xl font-bold">Comandas em Atendimento</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {ocupadas.map(c => <ComandaConsumoCard key={c.id} comanda={c} onAddMore={(c) => { setSelectedComanda(c); setView('venda'); }} />)}
            </div>
          </div>
        );
      case 'select-close':
        return (
          <div className="space-y-6">
            <PDVHeader title="Fechar Venda" onLogout={() => setAuthenticated(false)} />
            <Button variant="ghost" onClick={() => setView('main')}><ArrowLeft className="h-4 w-4 mr-2" /> Voltar</Button>
            <h2 className="text-xl font-bold">Selecione a Comanda para Fechar</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {ocupadas.map(c => (
                <CloseComandaCard 
                  key={c.id} 
                  comanda={c} 
                  onClose={() => setCloseSaleComanda(c)}
                  onTransfer={() => setTransferSourceComanda(c)}
                />
              ))}
            </div>
          </div>
        );
      default:
        return (
          <div className="space-y-10">
            <PDVHeader title="PDV Central" onLogout={() => setAuthenticated(false)} />
            <div className="max-w-4xl mx-auto space-y-10">
              {activeSession && (
                <div className="bg-white p-7 rounded-3xl shadow-xl border-none flex flex-col md:flex-row justify-between items-center gap-10">
                  <div className="flex items-center gap-6">
                    <div className="p-4 bg-primary/10 rounded-2xl text-primary"><Banknote className="h-10 w-10" /></div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-black tracking-widest mb-1">Saldo Atual em Caixa</p>
                      <h3 className="text-4xl font-black text-primary">{formatCurrency(balance.current)}</h3>
                    </div>
                  </div>
                  <div className="flex gap-4 w-full md:w-auto">
                    <Button variant="outline" size="lg" className="flex-1 rounded-2xl font-bold h-14" onClick={() => setSangriaOpen(true)}><ArrowDownCircle className="mr-2" /> Sangria</Button>
                    <Button variant="outline" size="lg" className="flex-1 rounded-2xl font-bold h-14 border-red-500 text-red-500 hover:bg-red-50" onClick={handleCloseCaixa}>Fechar Caixa</Button>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <Card className="cursor-pointer hover:ring-4 hover:ring-primary/20 hover:-translate-y-2 transition-all p-4 rounded-3xl border-none shadow-2xl group" onClick={() => setView('select-comanda')}>
                  <CardContent className="p-6 text-center space-y-5">
                    <div className="mx-auto h-24 w-24 rounded-3xl bg-green-500/10 flex items-center justify-center text-green-600 transition-transform group-hover:scale-110"><ShoppingCart className="h-12 w-12" /></div>
                    <h3 className="text-2xl font-black">Abrir Venda</h3>
                    <Badge className="bg-green-500 text-white font-bold h-7 px-4 rounded-full">{livres.length} Livres</Badge>
                  </CardContent>
                </Card>
                <Card className="cursor-pointer hover:ring-4 hover:ring-blue-500/20 hover:-translate-y-2 transition-all p-4 rounded-3xl border-none shadow-2xl group" onClick={() => setView('consumo')}>
                  <CardContent className="p-6 text-center space-y-5">
                    <div className="mx-auto h-24 w-24 rounded-3xl bg-blue-500/10 flex items-center justify-center text-blue-600 transition-transform group-hover:scale-110"><ClipboardList className="h-12 w-12" /></div>
                    <h3 className="text-2xl font-black">Consumo</h3>
                    <Badge className="bg-blue-500 text-white font-bold h-7 px-4 rounded-full">{ocupadas.length} Ativas</Badge>
                  </CardContent>
                </Card>
                <Card className="cursor-pointer hover:ring-4 hover:ring-amber-500/20 hover:-translate-y-2 transition-all p-4 rounded-3xl border-none shadow-2xl group" onClick={() => setView('select-close')}>
                  <CardContent className="p-6 text-center space-y-5">
                    <div className="mx-auto h-24 w-24 rounded-3xl bg-amber-500/10 flex items-center justify-center transition-transform group-hover:scale-110 text-amber-600 text-3xl font-black italic">R$</div>
                    <h3 className="text-2xl font-black">Fechar Venda</h3>
                    <div className="pt-2"><ArrowRight className="h-6 w-6 mx-auto text-amber-500 animate-pulse" /></div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] p-4 sm:p-10">
      <div className="max-w-7xl mx-auto">{renderCurrentView()}</div>
      <AbrirCaixaModal open={!loadingSession && !activeSession} />
      {activeSession && <SangriaModal open={sangriaOpen} onClose={() => setSangriaOpen(false)} sessionId={activeSession.id} />}
      {closeSaleComanda && <CloseSaleModal comanda={closeSaleComanda} open={!!closeSaleComanda} onClose={() => { setCloseSaleComanda(null); setView('main'); }} />}
      {selectorComanda && (
        <ProductSelectorModal
          open={!!selectorComanda}
          comandaNumero={selectorComanda.numero_comanda}
          onClose={() => setSelectorComanda(null)}
          onConfirm={async (items) => {
            const castedItems = items as any;
            try {
              await createOrder.mutateAsync({
                comandaId: selectorComanda.id,
                numeroComanda: selectorComanda.numero_comanda,
                items: castedItems.map((i: any) => ({
                  product_name: i.product.name,
                  quantity: i.quantity,
                  unit_price: Number(i.product.price || 0),
                  observation: i.observation,
                })),
              });
              if (selectorComanda.status === 'livre') await updateStatus.mutateAsync({ id: selectorComanda.id, status: 'ocupada' });
              toast({ title: 'Pedido enviado!' });
              setSelectorComanda(null);
            } catch (err: any) {
              toast({ title: 'Erro', description: err.message, variant: 'destructive' });
              throw err;
            }
          }}
          isLoading={createOrder.isPending}
        />
      )}
      {transferSourceComanda && <TransferComandaModal sourceComanda={transferSourceComanda} open={!!transferSourceComanda} onClose={() => setTransferSourceComanda(null)} />}
    </div>
  );
};

export default PDVPublic;
