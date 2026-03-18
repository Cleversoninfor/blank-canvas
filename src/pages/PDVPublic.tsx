import { useState } from 'react';
import {
  Trash2, ShoppingCart, ArrowLeft, Search, ArrowRight,
  Loader2, Receipt, Package, LockOpen, Lock, KeyRound, ClipboardList,
  Banknote, ArrowDownCircle, Info,
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';
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
import { cn } from "@/lib/utils";

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

const PDVHeader = ({ title }: { title: string }) => (
  <div className="sticky top-0 z-50 flex items-center gap-4 px-6 sm:px-10 py-5 bg-primary/95 backdrop-blur-md text-primary-foreground shadow-lg mb-8 -mx-4 sm:-mx-6 -mt-4 sm:-mt-6 rounded-b-[2rem]">
    <div className="bg-white/20 p-2 rounded-xl">
      <Receipt className="h-6 w-6" />
    </div>
    <h1 className="font-bold text-lg sm:text-xl flex-1 tracking-tight">{title}</h1>
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
  const { data: balance } = useCaixaBalance(activeSession?.id);
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
      setPasswordError('Senha do PDV não configurada. Configure em Configurações → Modos de Operação.');
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

  const handleSelectorConfirm = async (items: CartItem[]) => {
    if (!selectorComanda) return;
    try {
      await createOrder.mutateAsync({
        comandaId: selectorComanda.id,
        numeroComanda: selectorComanda.numero_comanda,
        items: items.map(i => ({
          product_name: i.product.name,
          quantity: i.quantity,
          unit_price: Number(i.product.price || 0),
          observation: i.observation,
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
    if (loadingProducts || loadingCategories) {
      return (
        <div className="col-span-full flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      );
    }

    if (productsError) {
      return (
        <p className="col-span-full text-center text-destructive py-8">
          Erro ao carregar produtos. Tente novamente.
        </p>
      );
    }

    if (filteredProducts.length === 0) {
      return <p className="col-span-full text-center text-muted-foreground py-8">Nenhum produto encontrado</p>;
    }

    return filteredProducts.map(product => (
      <Card key={product.id} className="cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all active:scale-[0.97]" onClick={() => addToCart(product)}>
        <CardContent className="p-3 space-y-2">
          {product.image_url && (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-24 object-cover rounded-lg"
              loading="lazy"
            />
          )}
          <p className="font-semibold text-sm text-foreground line-clamp-1">{product.name}</p>
          <p className="text-xs text-muted-foreground line-clamp-2 min-h-8">{product.description || 'Sem descrição'}</p>
          <p className="text-sm font-bold text-primary">{formatCurrency(product.price)}</p>
        </CardContent>
      </Card>
    ));
  };


  // === LOGIN SCREEN ===
  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F1F5F9] p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <KeyRound className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-xl">Acesso ao PDV</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingStore ? (
              <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : (
              <>
                <div className="space-y-2">
                  <Input
                    type="password"
                    placeholder="Senha do PDV"
                    value={passwordInput}
                    onChange={e => { setPasswordInput(e.target.value.slice(0, 8)); setPasswordError(''); }}
                    maxLength={8}
                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  />
                  {passwordError && (
                    <p className="text-sm text-destructive">{passwordError}</p>
                  )}
                </div>
                <Button className="w-full" size="lg" onClick={handleLogin}>
                  Entrar
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // === VENDA VIEW ===
  if (view === 'venda' && selectedComanda) {
    return (
      <div className="min-h-screen bg-[#F1F5F9] p-4 sm:p-6">
        <Helmet><title>PDV - Comanda #{selectedComanda.numero_comanda}</title></Helmet>
        <PDVHeader title={`PDV - Comanda #${selectedComanda.numero_comanda}`} />
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => { setView('main'); setSelectedComanda(null); setCart([]); }}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Voltar ao PDV
            </Button>
            <Button variant="destructive" onClick={() => setCloseSaleComanda(selectedComanda)}>
              <span className="font-bold mr-2 text-sm italic">R$</span> Fechar Venda
            </Button>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <Receipt className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-bold text-foreground">Comanda #{selectedComanda.numero_comanda}</h2>
            <Badge variant="secondary">{selectedComanda.status === 'livre' ? 'Iniciando' : 'Ocupada'}</Badge>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {renderProductsGrid()}
              </div>
            </div>

            <div className="lg:col-span-1">
              <Card className="admin-card border-none shadow-xl sticky top-24">
                <CardHeader className="bg-primary/5 pb-4">
                  <CardTitle className="flex items-center gap-3 text-lg font-bold">
                    <div className="p-2 bg-primary/20 rounded-lg text-primary">
                      <ShoppingCart className="h-5 w-5" />
                    </div>
                    Itens do Pedido
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 p-6">
                  {cart.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Clique nos produtos para adicionar</p>
                  ) : (
                    <>
                      {cart.map(item => (
                        <div key={item.product.id} className="flex items-center gap-2 text-sm justify-between">
                          <span className="truncate flex-1 font-medium">{item.product.name}</span>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 bg-muted px-2 py-1 rounded-lg">
                              <button onClick={() => updateQuantity(item.product.id, -1)} className="text-primary font-bold px-1">−</button>
                              <span className="w-4 text-center text-xs font-bold">{item.quantity}</span>
                              <button onClick={() => updateQuantity(item.product.id, 1)} className="text-primary font-bold px-1">+</button>
                            </div>
                            <span className="font-bold min-w-[60px] text-right">{formatCurrency(item.product.price * item.quantity)}</span>
                            <button onClick={() => removeFromCart(item.product.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></button>
                          </div>
                        </div>
                      ))}
                      <div className="border-t pt-4">
                        <div className="flex justify-between items-center mb-4">
                          <span className="text-muted-foreground font-medium">Total</span>
                          <span className="text-2xl font-black text-primary">{formatCurrency(cartTotal)}</span>
                        </div>
                        <Button className="w-full h-12 text-lg font-bold" onClick={handleFinalizarPedido} disabled={createOrder.isPending}>
                          {createOrder.isPending ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <ShoppingCart className="h-5 w-5 mr-2" />}
                          Enviar Pedido
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // === SELECT COMANDA FOR OPENING SALE ===
  if (view === 'select-comanda') {
    return (
      <div className="min-h-screen bg-[#F1F5F9] p-6 sm:p-10">
        <div className="max-w-7xl mx-auto space-y-10">
          <PDVHeader title="PDV - Abrir Venda" />
          <div className="space-y-8">
            <Button variant="ghost" onClick={() => setView('main')}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Voltar ao PDV
            </Button>
            <h2 className="text-xl font-bold text-foreground">Selecione uma Comanda Livre</h2>
            {loadingComandas ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : comandas.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhuma comanda disponível.</CardContent></Card>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {livres.map(comanda => (
                  <Card
                    key={comanda.id}
                    className="admin-card border-none shadow-lg cursor-pointer hover:ring-4 hover:ring-primary/20 active:scale-[0.98] transition-all"
                    onClick={() => handleSelectComanda(comanda)}
                  >
                    <CardContent className="p-8 text-center">
                      <div className="bg-green-100 p-3 rounded-full w-fit mx-auto mb-4 text-green-600">
                        <LockOpen className="h-8 w-8" />
                      </div>
                      <p className="font-bold text-xl mb-1">#{comanda.numero_comanda}</p>
                      <Badge variant="default" className="px-4 py-0.5 rounded-full font-bold">Livre</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // === CONSUMO COMANDAS VIEW ===
  if (view === 'consumo') {
    return (
      <div className="min-h-screen bg-[#F1F5F9] p-4 sm:p-6">
        <PDVHeader title="PDV - Consumo" />
        <div className="space-y-6">
          <Button variant="ghost" onClick={() => setView('main')}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar ao PDV
          </Button>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground">Comandas em Atendimento</h2>
            <Badge className="bg-blue-500">{ocupadas.length}</Badge>
          </div>
          {ocupadas.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhuma comanda ocupada no momento.</CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ocupadas.map(comanda => (
                <ComandaConsumoCard
                  key={comanda.id}
                  comanda={comanda}
                  onAddMore={(c) => setSelectorComanda(c)}
                />
              ))}
            </div>
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
        </div>
      </div>
    );
  }

  // === SELECT COMANDA FOR CLOSING SALE ===
  if (view === 'select-close') {
    return (
      <div className="min-h-screen bg-[#F1F5F9] p-4 sm:p-6">
        <PDVHeader title="PDV - Fechar Venda" />
        <div className="space-y-6">
          <Button variant="ghost" onClick={() => setView('main')}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar ao PDV
          </Button>
          <h2 className="text-xl font-bold text-foreground">Finalizar Comanda</h2>
          {ocupadas.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhuma comanda para fechar.</CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {ocupadas.map(comanda => (
                <CloseComandaCard
                  key={comanda.id}
                  comanda={comanda}
                  onClose={() => setCloseSaleComanda(comanda)}
                  onTransfer={() => setTransferSourceComanda(comanda)}
                />
              ))}
            </div>
          )}
          {closeSaleComanda && (
            <CloseSaleModal comanda={closeSaleComanda} open={!!closeSaleComanda} onClose={() => { setCloseSaleComanda(null); setView('main'); }} />
          )}
          {transferSourceComanda && (
            <TransferComandaModal
              sourceComanda={transferSourceComanda}
              open={!!transferSourceComanda}
              onClose={() => setTransferSourceComanda(null)}
            />
          )}
        </div>
      </div>
    );
  }

  // === MAIN PDV VIEW ===
  return (
    <div className="min-h-screen bg-[#F1F5F9] p-6 sm:p-10">
      <Helmet><title>PDV Central</title></Helmet>
      <div className="max-w-7xl mx-auto space-y-10">
        <PDVHeader title="PDV Central" />
      
        {/* Caixa Summary Area */}
        {activeSession && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="bg-white border-none shadow-md overflow-hidden">
              <div className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Saldo em Caixa</p>
                  <h3 className="text-2xl font-black text-primary">
                    {balance?.current.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00'}
                  </h3>
                </div>
                <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                  <Banknote className="h-6 w-6" />
                </div>
              </div>
              <div className="px-5 py-3 bg-muted/30 flex justify-between text-[10px] font-bold text-muted-foreground uppercase">
                <span>Inicial: {balance?.initial.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                <span className="text-green-600">Entradas: {balance?.entradas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                <span className="text-red-500">Sangrias: {balance?.saidas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
              </div>
            </Card>

            <div className="flex gap-4 md:col-span-2">
              <Button 
                variant="outline" 
                className="h-full flex-1 border-dashed border-2 hover:border-destructive hover:text-destructive flex flex-col gap-2 p-6 transition-all bg-white"
                onClick={() => setSangriaOpen(true)}
              >
                <ArrowDownCircle className="h-6 w-6" />
                <div className="text-left">
                  <p className="font-bold text-sm">Realizar Sangria</p>
                  <p className="text-[10px] opacity-70">Retirada de valor do caixa</p>
                </div>
              </Button>

              <Button 
                variant="outline" 
                className="h-full flex-1 border-dashed border-2 hover:border-primary hover:text-primary flex flex-col gap-2 p-6 transition-all bg-white"
                onClick={handleCloseCaixa}
                disabled={closeCaixa.isPending}
              >
                <Info className="h-6 w-6" />
                <div className="text-left">
                  <p className="font-bold text-sm">Fechar Caixa</p>
                  <p className="text-[10px] opacity-70">Encerra o turno atual</p>
                </div>
              </Button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Abrir Venda */}
          <Card 
            className="admin-card border-none shadow-xl cursor-pointer hover:ring-4 hover:ring-primary/20 transition-all group" 
            onClick={() => setView('select-comanda')}
          >
            <CardContent className="p-10 text-center space-y-4">
              <div className="mx-auto h-20 w-20 rounded-3xl bg-green-500/10 flex items-center justify-center text-green-600 transition-transform group-hover:scale-110">
                <ShoppingCart className="h-10 w-10" />
              </div>
              <div>
                <CardTitle className="text-2xl font-black">Abrir Venda</CardTitle>
                <p className="text-muted-foreground font-medium">Inicie um novo pedido</p>
              </div>
              <div className="pt-2">
                <Badge className="bg-green-500 px-4 py-1">{livres.length} Livres</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Consumo */}
          <Card 
            className="admin-card border-none shadow-xl cursor-pointer hover:ring-4 hover:ring-blue-500/20 transition-all group" 
            onClick={() => setView('consumo')}
          >
            <CardContent className="p-10 text-center space-y-4">
              <div className="mx-auto h-20 w-20 rounded-3xl bg-blue-500/10 flex items-center justify-center text-blue-600 transition-transform group-hover:scale-110">
                <ClipboardList className="h-10 w-10" />
              </div>
              <div>
                <CardTitle className="text-2xl font-black">Consumo</CardTitle>
                <p className="text-muted-foreground font-medium">Gerenciar itens em aberto</p>
              </div>
              <div className="pt-2">
                <Badge className="bg-blue-500 px-4 py-1">{ocupadas.length} Ocupadas</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Fechar Venda */}
          <Card 
            className="admin-card border-none shadow-xl cursor-pointer hover:ring-4 hover:ring-amber-500/20 transition-all group" 
            onClick={() => setView('select-close')}
          >
            <CardContent className="p-10 text-center space-y-4">
              <div className="mx-auto h-20 w-20 rounded-3xl bg-amber-500/10 flex items-center justify-center text-amber-600 transition-transform group-hover:scale-110 font-black text-2xl italic">
                R$
              </div>
              <div>
                <CardTitle className="text-2xl font-black">Fechar Venda</CardTitle>
                <p className="text-muted-foreground font-medium">Finalizar pagamentos</p>
              </div>
              <div className="pt-2">
                <ArrowRight className="h-6 w-6 mx-auto text-amber-500 animate-pulse" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <AbrirCaixaModal open={!loadingSession && !activeSession} />
      {activeSession && (
        <SangriaModal 
          open={sangriaOpen} 
          onClose={() => setSangriaOpen(false)} 
          sessionId={activeSession.id} 
        />
      )}
    </div>
  );
};

export default PDVPublic;
