import { useState } from 'react';
import { Search, ShoppingCart, Trash2, Loader2, Package, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useProducts, Product } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';

const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface CartItem {
  product: Product;
  quantity: number;
}

interface ProductSelectorModalProps {
  open: boolean;
  comandaNumero: number;
  onClose: () => void;
  onConfirm: (items: CartItem[]) => Promise<void>;
  isLoading?: boolean;
}

export function ProductSelectorModal({ open, comandaNumero, onClose, onConfirm, isLoading }: ProductSelectorModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);

  const { data: allProductsData, isLoading: loadingProducts } = useProducts();
  const allProducts = Array.isArray(allProductsData) ? allProductsData : [];
  const { data: categoriesData } = useCategories();
  const categories = Array.isArray(categoriesData) ? categoriesData : [];

  const filteredProducts = allProducts.filter(p => {
    const matchesSearch = !searchTerm ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === null || p.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev =>
      prev
        .map(i => i.product.id === productId ? { ...i, quantity: i.quantity + delta } : i)
        .filter(i => i.quantity > 0)
    );
  };

  const cartTotal = cart.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  const totalItems = cart.reduce((s, i) => s + i.quantity, 0);

  const handleClose = () => {
    setCart([]);
    setSearchTerm('');
    setSelectedCategory(null);
    onClose();
  };

  const handleConfirm = async () => {
    if (cart.length === 0) return;
    await onConfirm(cart);
    setCart([]);
    setSearchTerm('');
    setSelectedCategory(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold">
              Comanda #{comandaNumero} — Adicionar Itens
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* Left: Product List */}
          <div className="flex-1 flex flex-col overflow-hidden border-r">
            {/* Search + Category Filters */}
            <div className="px-4 pt-4 pb-3 space-y-3 flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar produto..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10"
                  autoFocus
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Badge
                  variant={selectedCategory === null ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setSelectedCategory(null)}
                >
                  Todos
                </Badge>
                {categories.map(cat => (
                  <Badge
                    key={cat.id}
                    variant={selectedCategory === cat.id ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => setSelectedCategory(cat.id)}
                  >
                    {cat.name}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Products Grid */}
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              {loadingProducts ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : allProducts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>Nenhum produto cadastrado.</p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>Nenhum produto encontrado para "{searchTerm}"</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {filteredProducts.map(product => {
                    const inCart = cart.find(i => i.product.id === product.id);
                    return (
                      <Card
                        key={product.id}
                        className={`cursor-pointer transition-all active:scale-[0.97] select-none ${
                          inCart
                            ? 'ring-2 ring-primary bg-primary/5'
                            : 'hover:ring-2 hover:ring-primary/30'
                        }`}
                        onClick={() => addToCart(product)}
                      >
                        <CardContent className="p-3 relative">
                          {inCart && (
                            <div className="absolute top-2 right-2 h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                              {inCart.quantity}
                            </div>
                          )}
                          {product.image_url && (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="w-full h-20 object-cover rounded-lg mb-2"
                            />
                          )}
                          <p className="font-medium text-sm text-foreground truncate">{product.name}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2 min-h-8">{product.description || 'Sem descrição'}</p>
                          <p className="text-sm font-bold text-primary">{formatCurrency(product.price)}</p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right: Cart */}
          <div className="w-72 flex-shrink-0 flex flex-col">
            <div className="px-4 pt-4 pb-3 border-b flex-shrink-0">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-primary" />
                <span className="font-semibold">Pedido</span>
                {totalItems > 0 && (
                  <Badge className="ml-auto">{totalItems} itens</Badge>
                )}
              </div>
            </div>

            {/* Cart items */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {cart.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Clique nos produtos para adicionar
                </p>
              ) : (
                cart.map(item => (
                  <div key={item.product.id} className="space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium leading-tight flex-1">{item.product.name}</span>
                      <button
                        className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                        onClick={() => updateQuantity(item.product.id, -item.quantity)}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon-sm"
                          onClick={() => updateQuantity(item.product.id, -1)}
                        >
                          -
                        </Button>
                        <span className="w-6 text-center text-sm font-bold">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon-sm"
                          onClick={() => updateQuantity(item.product.id, 1)}
                        >
                          +
                        </Button>
                      </div>
                      <span className="text-sm font-semibold text-primary">
                        {formatCurrency(item.product.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="px-4 pb-5 pt-3 border-t flex-shrink-0 space-y-3">
              {cart.length > 0 && (
                <div className="flex justify-between font-bold text-base">
                  <span>Total</span>
                  <span className="text-primary">{formatCurrency(cartTotal)}</span>
                </div>
              )}
              <Button
                className="w-full"
                size="lg"
                disabled={cart.length === 0 || isLoading}
                onClick={handleConfirm}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <ShoppingCart className="h-4 w-4 mr-2" />
                )}
                Enviar para Cozinha
              </Button>
              <Button variant="ghost" className="w-full" onClick={handleClose} disabled={isLoading}>
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
