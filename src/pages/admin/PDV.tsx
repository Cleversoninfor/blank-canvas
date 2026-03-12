import { useState } from 'react';
import {
  Plus, Trash2, ShoppingCart, Hash, ArrowLeft, Search,
  Loader2, Receipt, Package, DollarSign, LockOpen, Lock,
} from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
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

type PDVView = 'main' | 'select-comanda' | 'venda' | 'select-close';

interface CartItem {
  product: Product;
  quantity: number;
  observation?: string;
}

const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const PDV = () => {
  const { toast } = useToast();
  const { data: comandas = [], isLoading: loadingComandas } = useComandas();
  const { data: products = [] } = useProducts();
  const { data: categories = [] } = useCategories();
  const createComanda = useCreateComanda();
  const deleteComanda = useDeleteComanda();
  const createOrder = useCreateComandaOrder();
  const updateStatus = useUpdateComandaStatus();

  const [view, setView] = useState<PDVView>('main');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newNumero, setNewNumero] = useState('');
  const [selectedComanda, setSelectedComanda] = useState<Comanda | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [closeSaleComanda, setCloseSaleComanda] = useState<Comanda | null>(null);

  const livres = comandas.filter(c => c.status === 'livre');
  const ocupadas = comandas.filter(c => c.status === 'ocupada');

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

  const handleSelectComanda = async (comanda: Comanda) => {
    // Mark as ocupada
    try {
      await updateStatus.mutateAsync({ id: comanda.id, status: 'ocupada' });
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
      return;
    }
    setSelectedComanda({ ...comanda, status: 'ocupada' });
    setCart([]);
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

  const cartTotal = cart.reduce((sum, i) => sum + i.product.price * i.quantity, 0);

  const handleFinalizarPedido = async () => {
    if (!selectedComanda || cart.length === 0) return;
    try {
      await createOrder.mutateAsync({
        comandaId: selectedComanda.id,
        numeroComanda: selectedComanda.numero_comanda,
        items: cart.map(i => ({
          product_name: i.product.name,
          quantity: i.quantity,
          unit_price: i.product.price,
          observation: i.observation,
        })),
      });
      toast({ title: 'Pedido enviado!', description: `Pedido da Comanda #${selectedComanda.numero_comanda} enviado para a cozinha.` });
      setCart([]);
    } catch (err: any) {
      toast({ title: 'Erro ao enviar pedido', description: err.message, variant: 'destructive' });
    }
  };

  const availableProducts = products.filter(p => p.is_available);
  const filteredProducts = availableProducts.filter(p => {
    // Check search term
    const matchesSearch = !searchTerm || 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Check category - handle null state (All) properly
    const matchesCategory = selectedCategory === null || p.category_id === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // === VENDA VIEW ===
  if (view === 'venda' && selectedComanda) {
    return (
      <AdminLayout title={`PDV - Comanda #${selectedComanda.numero_comanda}`}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => { setView('main'); setSelectedComanda(null); setCart([]); }}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao PDV
            </Button>
            <Button
              variant="destructive"
              onClick={() => setCloseSaleComanda(selectedComanda)}
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Fechar Venda
            </Button>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <Receipt className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-bold text-foreground">Comanda #{selectedComanda.numero_comanda}</h2>
            <Badge variant="secondary">Ocupada</Badge>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Products */}
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

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {filteredProducts.map(product => (
                  <Card key={product.id} className="cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all active:scale-[0.97]" onClick={() => addToCart(product)}>
                    <CardContent className="p-3">
                      {product.image_url && <img src={product.image_url} alt={product.name} className="w-full h-20 object-cover rounded-lg mb-2" />}
                      <p className="font-medium text-sm text-foreground truncate">{product.name}</p>
                      <p className="text-sm font-bold text-primary">{formatCurrency(product.price)}</p>
                    </CardContent>
                  </Card>
                ))}
                {filteredProducts.length === 0 && (
                  <p className="col-span-full text-center text-muted-foreground py-8">Nenhum produto encontrado</p>
                )}
              </div>
            </div>

            {/* Cart */}
            <div className="lg:col-span-1">
              <Card className="sticky top-20">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ShoppingCart className="h-5 w-5" />
                    Pedido
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
                // If sale was closed, go back to main
                setView('main');
                setSelectedComanda(null);
                setCart([]);
              }}
            />
          )}
        </div>
      </AdminLayout>
    );
  }

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
                    className={`transition-all ${
                      isLivre
                        ? 'cursor-pointer hover:ring-2 hover:ring-primary/30 active:scale-[0.97]'
                        : 'opacity-60 cursor-not-allowed'
                    }`}
                    onClick={() => isLivre && handleSelectComanda(comanda)}
                  >
                    <CardContent className="p-4 text-center">
                      {isLivre ? (
                        <LockOpen className="h-8 w-8 mx-auto mb-2 text-green-500" />
                      ) : (
                        <Lock className="h-8 w-8 mx-auto mb-2 text-destructive" />
                      )}
                      <p className="font-bold text-lg">Comanda #{comanda.numero_comanda}</p>
                      <Badge variant={isLivre ? 'default' : 'destructive'} className="mt-1">
                        {isLivre ? 'Livre' : 'Ocupada'}
                      </Badge>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
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
            <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhuma comanda ocupada no momento.</CardContent></Card>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {ocupadas.map(comanda => (
                <Card
                  key={comanda.id}
                  className="cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all active:scale-[0.97]"
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Criar Comanda */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hash className="h-5 w-5" />
                Criar Comanda
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!showCreateForm ? (
                <Button onClick={() => setShowCreateForm(true)} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Comanda
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
                      <Button variant="action-icon-destructive" size="icon-sm" onClick={() => handleDeleteComanda(comanda)} disabled={deleteComanda.isPending} title="Excluir comanda">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Abrir Venda */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Abrir Venda
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={() => setView('select-comanda')} className="w-full" size="lg" disabled={livres.length === 0}>
                <Package className="h-4 w-4 mr-2" />
                Abrir Venda
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                {livres.length === 0 ? 'Nenhuma comanda livre disponível' : `${livres.length} comanda(s) livre(s)`}
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
              <Button onClick={() => setView('select-close')} className="w-full" size="lg" variant="destructive" disabled={ocupadas.length === 0}>
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
