import { useState } from 'react';
import { Search, Plus, Minus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { useTableOrderMutations } from '@/hooks/useTableOrders';
import { cn } from '@/lib/utils';

interface AddItemModalProps {
  orderId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOrderIdChange?: (newOrderId: number) => void;
}

export function AddItemModal({ orderId, open, onOpenChange, onOrderIdChange }: AddItemModalProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<{
    id: string;
    name: string;
    price: number;
  } | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [observation, setObservation] = useState('');

  const { data: products, isLoading: loadingProducts } = useProducts();
  const { data: categories } = useCategories();
  const { addItem } = useTableOrderMutations();

  const availableProducts = products?.filter(p => p.is_available) || [];

  const filteredProducts = availableProducts.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !selectedCategory || product.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleAddItem = async () => {
    if (!selectedProduct) return;

    try {
      const result = await addItem.mutateAsync({
        orderId,
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        quantity,
        unitPrice: selectedProduct.price,
        observation: observation || undefined,
      });

      // If the mutation created a new order, switch the screen to it
      if (result?.orderId && result.orderId !== orderId) {
        onOrderIdChange?.(result.orderId);
      }

      // Reset and close
      setSelectedProduct(null);
      setQuantity(1);
      setObservation('');
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleProductClick = (product: typeof filteredProducts[0]) => {
    setSelectedProduct({
      id: product.id,
      name: product.name,
      price: Number(product.price),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Adicionar Item</DialogTitle>
        </DialogHeader>

        {!selectedProduct ? (
          <>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar produto..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Categories */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              <Button
                variant={selectedCategory === null ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(null)}
              >
                Todos
              </Button>
              {categories?.map((cat) => (
                <Button
                  key={cat.id}
                  variant={selectedCategory === cat.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(cat.id)}
                  className="whitespace-nowrap"
                >
                  {cat.name}
                </Button>
              ))}
            </div>

            {/* Products Grid */}
            <ScrollArea className="flex-1 min-h-0">
              {loadingProducts ? (
                <div className="text-center py-8 text-muted-foreground">
                  Carregando produtos...
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum produto encontrado
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-1">
                  {filteredProducts.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => handleProductClick(product)}
                      className={cn(
                        "text-left p-3 rounded-xl border transition-all hover:border-primary hover:shadow-md",
                        "bg-card"
                      )}
                    >
                      {product.image_url && (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-20 object-cover rounded-lg mb-2"
                        />
                      )}
                      <p className="font-medium text-sm text-foreground line-clamp-2">
                        {product.name}
                      </p>
                      <p className="text-primary font-bold text-sm mt-1">
                        {formatCurrency(Number(product.price))}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </>
        ) : (
          /* Product Details */
          <div className="space-y-4">
            <div className="bg-muted rounded-xl p-4">
              <h3 className="font-bold text-lg">{selectedProduct.name}</h3>
              <p className="text-primary font-bold text-xl">
                {formatCurrency(selectedProduct.price)}
              </p>
            </div>

            {/* Quantity */}
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="text-2xl font-bold w-12 text-center">{quantity}</span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity(quantity + 1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Observation */}
            <div>
              <Textarea
                placeholder="Observações (opcional)"
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                rows={2}
              />
            </div>

            {/* Total */}
            <div className="bg-primary/10 rounded-xl p-4 text-center">
              <p className="text-sm text-muted-foreground">Total do item</p>
              <p className="text-2xl font-bold text-primary">
                {formatCurrency(selectedProduct.price * quantity)}
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setSelectedProduct(null)}
              >
                Voltar
              </Button>
              <Button
                className="flex-1"
                onClick={handleAddItem}
                disabled={addItem.isPending}
              >
                {addItem.isPending ? 'Adicionando...' : 'Adicionar'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
