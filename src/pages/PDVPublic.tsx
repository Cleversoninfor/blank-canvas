import { useState } from 'react';
import {
  Plus, Trash2, ShoppingCart, Hash, ArrowLeft, Search, ArrowRight,
  Loader2, Receipt, Package, DollarSign, LockOpen, Lock, KeyRound, ClipboardList,
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  useComandas, useCreateComanda, useDeleteComanda,
  useCreateComandaOrder, useUpdateComandaStatus, Comanda,
} from '@/hooks/useComandas';
import { useProducts, Product } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { CloseSaleModal } from '@/components/pdv/CloseSaleModal';
import { ProductSelectorModal } from '@/components/pdv/ProductSelectorModal';
import { ComandaConsumoCard } from '@/components/pdv/ComandaConsumoCard';
import { TransferComandaModal } from '@/components/pdv/TransferComandaModal';
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

const PDVPublic = () => {
  const { toast } = useToast();
  const { data: store, isLoading: loadingStore } = useStoreConfig();
  const [authenticated, setAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useTheme();

  // PDV state
  const { data: comandas = [], isLoading: loadingComandas } = useComandas();
  const { data: productsData, isLoading: loadingProducts, error: productsError } = useProducts();
  const products = Array.isArray(productsData) ? productsData : [];
  const { data: categoriesData, isLoading: loadingCategories } = useCategories();
  const categories = Array.isArray(categoriesData) ? categoriesData : [];
  const createComanda = useCreateComanda();
  const deleteComanda = useDeleteComanda();
  const createOrder = useCreateComandaOrder();
  const updateStatus = useUpdateComandaStatus();

  const [view, setView] = useState<PDVView>('main');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newNumero, setNewNumero] = useState('');
  const [selectedComanda, setSelectedComanda] = useState<Comanda | null>(null);
  const [selectorComanda, setSelectorComanda] = useState<Comanda | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [closeSaleComanda, setCloseSaleComanda] = useState<Comanda | null>(null);
  const [transferSourceComanda, setTransferSourceComanda] = useState<Comanda | null>(null);

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

  // === LOGIN SCREEN ===
  if (!authenticated) {
    return (
      <>
        <Helmet><title>Acesso ao PDV</title></Helmet>
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
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
      </>
    );
  }

  // === PDV HANDLERS (same as admin PDV) ===
  const handleCreateComanda = async () => {
    const num = parseInt(newNumero);
    if (isNaN(num) || num <= 0) {
      toast({ title: 'Número inválido', description: 'Informe um número válido para a comanda.', variant: 'destructive' });
      return;
    }
    try {
      await createComanda.mutateAsync(num);
      toast({ title: 'Comanda criada', description: `Comanda #${num} criada com sucesso.` });
      setNewNumero('');
      setShowCreateForm(false);
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message?.includes('unique') ? 'Já existe uma comanda com esse número.' : err.message, variant: 'destructive' });
    }
  };

  const handleDeleteComanda = async (comanda: Comanda) => {
    try {
      await deleteComanda.mutateAsync(comanda.id);
      toast({ title: 'Comanda excluída', description: `Comanda #${comanda.numero_comanda} foi removida.` });
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  const handleSelectComanda = (comanda: Comanda) => {
    setSelectorComanda(comanda);

    if (comanda.status === 'livre') {
      updateStatus.mutateAsync({ id: comanda.id, status: 'ocupada' }).catch((err: any) => {
        console.error('Erro ao atualizar status da comanda:', err);
        toast({
          title: 'Aviso',
          description: 'Não foi possível atualizar o status da comanda, mas você pode continuar a venda.',
          variant: 'destructive',
        });
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
          unit_price: Number(i.product.price || 0),
          observation: i.observation,
        })),
      });

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
      toast({ title: 'Pedido enviado!', description: `Pedido da Comanda #${selectedComanda.numero_comanda} enviado para a cozinha.` });
      setCart([]);
    } catch (err: any) {
      toast({ title: 'Erro ao enviar pedido', description: err.message, variant: 'destructive' });
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
    try {
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
    } catch (error) {
      console.error('Erro ao renderizar produtos no PDV:', error);
      return (
        <p className="col-span-full text-center text-destructive py-8">
          Erro ao exibir produtos. Atualize a página e tente novamente.
        </p>
      );
    }
  };

  const PDVHeader = ({ title }: { title: string }) => (
    <div className="sticky top-0 z-30 flex items-center gap-3 px-4 sm:px-6 py-3 bg-primary text-primary-foreground shadow-md mb-4 -mx-4 sm:-mx-6 -mt-4 sm:-mt-6 rounded-b-xl">
      <Receipt className="h-5 w-5" />
      <h1 className="font-semibold text-sm sm:text-base flex-1">{title}</h1>
      <Button variant="ghost" size="sm" className="text-primary-foreground hover:text-primary-foreground/80" onClick={() => setAuthenticated(false)}>
        Sair
      </Button>
    </div>
  );

  // === VENDA VIEW ===
  if (view === 'venda' && selectedComanda) {
    return (
      <>
        <Helmet><title>PDV - Comanda #{selectedComanda.numero_comanda}</title></Helmet>
        <div className="min-h-screen bg-background p-4 sm:p-6">
          <PDVHeader title={`PDV - Comanda #${selectedComanda.numero_comanda}`} />
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={() => { setView('main'); setSelectedComanda(null); setCart([]); }}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Voltar ao PDV
              </Button>
              <Button variant="destructive" onClick={() => setCloseSaleComanda(selectedComanda)}>
                <DollarSign className="h-4 w-4 mr-2" /> Fechar Venda
              </Button>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <Receipt className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-bold text-foreground">Comanda #{selectedComanda.numero_comanda}</h2>
              <Badge variant="secondary">Ocupada</Badge>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 space-y-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar produto..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant={selectedCategory === null ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setSelectedCategory(null)}>Todos</Badge>
                  {categories.map(cat => (
                    <Badge key={cat.id} variant={selectedCategory === cat.id ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setSelectedCategory(cat.id)}>{cat.name}</Badge>
                  ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                  {renderProductsGrid()}
                </div>
              </div>

              <div className="lg:col-span-1">
                <Card className="sticky top-20">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <ShoppingCart className="h-5 w-5" /> Pedido
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {cart.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Clique nos produtos para adicionar</p>
                    ) : (
                      <>
                        {cart.map(item => (
                          <div key={item.product.id} className="flex items-center gap-2 text-sm">
                            <div className="flex items-center gap-1">
                              <Button variant="outline" size="icon-sm" onClick={() => updateQuantity(item.product.id, -1)}>-</Button>
                              <span className="w-6 text-center font-bold">{item.quantity}</span>
                              <Button variant="outline" size="icon-sm" onClick={() => updateQuantity(item.product.id, 1)}>+</Button>
                            </div>
                            <span className="flex-1 truncate">{item.product.name}</span>
                            <span className="font-medium">{formatCurrency(item.product.price * item.quantity)}</span>
                            <Button variant="ghost" size="icon-sm" onClick={() => removeFromCart(item.product.id)}>
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        ))}
                        <div className="border-t border-border pt-3 mt-3">
                          <div className="flex justify-between font-bold text-lg">
                            <span>Total</span>
                            <span className="text-primary">{formatCurrency(cartTotal)}</span>
                          </div>
                        </div>
                        <Button className="w-full" size="lg" onClick={handleFinalizarPedido} disabled={createOrder.isPending}>
                          {createOrder.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShoppingCart className="h-4 w-4 mr-2" />}
                          Enviar Pedido
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            {closeSaleComanda && (
              <CloseSaleModal
                comanda={closeSaleComanda}
                open={!!closeSaleComanda}
                onClose={() => {
                  setCloseSaleComanda(null);
                  setView('main');
                  setSelectedComanda(null);
                  setCart([]);
                }}
              />
            )}
          </div>
        </div>
      </>
    );
  }

  // === SELECT COMANDA FOR OPENING SALE ===
  if (view === 'select-comanda') {
    return (
      <>
        <Helmet><title>PDV - Abrir Venda</title></Helmet>
        <div className="min-h-screen bg-background p-4 sm:p-6">
          <PDVHeader title="PDV - Abrir Venda" />
          <div className="space-y-4">
            <Button variant="ghost" onClick={() => setView('main')}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Voltar ao PDV
            </Button>
            <h2 className="text-xl font-bold text-foreground">Selecione uma Comanda</h2>
            {loadingComandas ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : comandas.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhuma comanda disponível. Crie uma comanda primeiro.</CardContent></Card>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {comandas.map(comanda => {
                  const isLivre = comanda.status === 'livre';
                  return (
                    <Card
                      key={comanda.id}
                      className={`relative transition-all ${isLivre ? 'cursor-pointer hover:ring-2 hover:ring-primary/30 active:scale-[0.97]' : 'opacity-60 cursor-not-allowed'}`}
                      onClick={() => isLivre && handleSelectComanda(comanda)}
                    >
                      <CardContent className="p-4 text-center">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="absolute top-1 right-1 h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 z-10"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteComanda(comanda);
                          }}
                          title="Excluir comanda"
                          disabled={deleteComanda.isPending}
                        >
                          {deleteComanda.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                        </Button>
                        {isLivre ? <LockOpen className="h-8 w-8 mx-auto mb-2 text-green-500" /> : <Lock className="h-8 w-8 mx-auto mb-2 text-destructive" />}
                        <p className="font-bold text-lg">Comanda #{comanda.numero_comanda}</p>
                        <Badge variant={isLivre ? 'default' : 'destructive'} className="mt-1">{isLivre ? 'Livre' : 'Ocupada'}</Badge>
                      </CardContent>
                    </Card>
                  );
                })}
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
      </>
    );
  }

  // === CONSUMO COMANDAS VIEW ===
  if (view === 'consumo') {
    return (
      <>
        <Helmet><title>PDV - Consumo Comandas</title></Helmet>
        <div className="min-h-screen bg-background p-4 sm:p-6">
          <PDVHeader title="PDV - Consumo Comandas" />
          <div className="space-y-4">
            <Button variant="ghost" onClick={() => setView('main')}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Voltar ao PDV
            </Button>
            <h2 className="text-xl font-bold text-foreground">Comandas em Consumo</h2>
            {ocupadas.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhuma comanda ocupada no momento.</CardContent></Card>
            ) : (
              <div className="space-y-3">
                {ocupadas.map(comanda => (
                  <ComandaConsumoCard
                    key={comanda.id}
                    comanda={comanda}
                    onAddMore={(c) => {
                      setSelectorComanda(c);
                    }}
                    onCloseSale={(c) => setCloseSaleComanda(c)}
                    onDelete={(c) => handleDeleteComanda(c)}
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
            {closeSaleComanda && (
              <CloseSaleModal comanda={closeSaleComanda} open={!!closeSaleComanda} onClose={() => { setCloseSaleComanda(null); setView('main'); }} />
            )}
          </div>
        </div>
      </>
    );
  }

  // === SELECT COMANDA FOR CLOSING SALE ===
  if (view === 'select-close') {
    return (
      <>
        <Helmet><title>PDV - Fechar Venda</title></Helmet>
        <div className="min-h-screen bg-background p-4 sm:p-6">
          <PDVHeader title="PDV - Fechar Venda" />
          <div className="space-y-4">
            <Button variant="ghost" onClick={() => setView('main')}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Voltar ao PDV
            </Button>
            <h2 className="text-xl font-bold text-foreground">Selecione a Comanda para Fechar</h2>
            {ocupadas.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhuma comanda ocupada no momento.</CardContent></Card>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {ocupadas.map(comanda => (
                  <Card 
                    key={comanda.id} 
                    className="relative cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all active:scale-[0.97]" 
                    onClick={() => setCloseSaleComanda(comanda)}
                  >
                    <CardContent className="p-4 text-center">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="absolute top-1 right-1 h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 z-10"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteComanda(comanda);
                        }}
                        title="Excluir comanda"
                        disabled={deleteComanda.isPending}
                      >
                        {deleteComanda.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="absolute top-1 left-1 h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10 z-10"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTransferSourceComanda(comanda);
                        }}
                        title="Transferir pedidos"
                      >
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                      <Lock className="h-8 w-8 mx-auto mb-2 text-destructive" />
                      <p className="font-bold text-lg">Comanda #{comanda.numero_comanda}</p>
                      <Badge variant="destructive" className="mt-1">Ocupada</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            {transferSourceComanda && (
              <TransferComandaModal
                sourceComanda={transferSourceComanda}
                open={!!transferSourceComanda}
                onClose={() => setTransferSourceComanda(null)}
              />
            )}
            {closeSaleComanda && (
              <CloseSaleModal comanda={closeSaleComanda} open={!!closeSaleComanda} onClose={() => { setCloseSaleComanda(null); setView('main'); }} />
            )}
          </div>
        </div>
      </>
    );
  }

  // === MAIN PDV VIEW ===
  return (
    <>
      <Helmet><title>PDV</title></Helmet>
      <div className="min-h-screen bg-background p-4 sm:p-6">
        <PDVHeader title="PDV" />
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Criar Comanda */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Hash className="h-5 w-5" /> Criar Comanda
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!showCreateForm ? (
                  <Button onClick={() => setShowCreateForm(true)} className="w-full">
                    <Plus className="h-4 w-4 mr-2" /> Nova Comanda
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Input type="number" placeholder="Nº da Comanda" value={newNumero} onChange={e => setNewNumero(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreateComanda()} />
                    <Button onClick={handleCreateComanda} disabled={createComanda.isPending}>
                      {createComanda.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Criar'}
                    </Button>
                    <Button variant="ghost" onClick={() => { setShowCreateForm(false); setNewNumero(''); }}>Cancelar</Button>
                  </div>
                )}
                {loadingComandas ? (
                  <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>
                ) : comandas.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhuma comanda criada</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {comandas.map(comanda => (
                      <div key={comanda.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2">
                          <Receipt className="h-4 w-4 text-primary" />
                          <span className="font-medium">#{comanda.numero_comanda}</span>
                          <Badge variant={comanda.status === 'livre' ? 'default' : 'destructive'} className="text-xs">
                            {comanda.status === 'livre' ? 'Livre' : 'Ocupada'}
                          </Badge>
                        </div>
                        {comanda.status === 'livre' && (
                          <Button variant="action-icon-destructive" size="icon-sm" onClick={() => handleDeleteComanda(comanda)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Abrir Venda */}
            <Card className="cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all" onClick={() => setView('select-comanda')}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" /> Abrir Venda
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">Selecione uma comanda livre para iniciar uma venda.</p>
                <div className="flex gap-4 text-center">
                  <div className="flex-1 p-3 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold text-primary">{livres.length}</p>
                    <p className="text-xs text-muted-foreground">Livres</p>
                  </div>
                  <div className="flex-1 p-3 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold text-destructive">{ocupadas.length}</p>
                    <p className="text-xs text-muted-foreground">Ocupadas</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Consumo Comandas */}
            <Card className="cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all" onClick={() => setView('consumo')}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" /> Consumo Comandas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">Veja os itens das comandas ocupadas, adicione ou remova produtos.</p>
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-primary">{ocupadas.length}</p>
                  <p className="text-xs text-muted-foreground">Comandas em consumo</p>
                </div>
              </CardContent>
            </Card>

            {/* Fechar Venda */}
            <Card className="cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all" onClick={() => setView('select-close')}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" /> Fechar Venda
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">Finalize uma venda e libere a comanda.</p>
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-foreground">{ocupadas.length}</p>
                  <p className="text-xs text-muted-foreground">Comandas para fechar</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
};

export default PDVPublic;
