import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Category } from '@/hooks/useCategories';
import { Product } from '@/hooks/useProducts';
import { MenuProductCard } from './MenuProductCard';
import { Button } from '@/components/ui/button';

interface CategoryGridProps {
  categories: Category[];
  products: Product[];
  onProductSelect: (product: Product) => void;
}

const categoryGradients = [
  'from-orange-500 to-red-600',
  'from-emerald-500 to-teal-600',
  'from-violet-500 to-purple-600',
  'from-blue-500 to-cyan-600',
  'from-pink-500 to-rose-600',
  'from-amber-500 to-yellow-600',
  'from-indigo-500 to-blue-600',
  'from-lime-500 to-green-600',
];

const categoryEmojis: Record<string, string> = {
  'Lanches': '🍔',
  'Hambúrgueres': '🍔',
  'Porções': '🍟',
  'Acompanhamentos': '🍟',
  'Bebidas': '🥤',
  'Combos': '🎁',
  'Sobremesas': '🍰',
  'Pizzas': '🍕',
  'Açaí': '🍇',
  'Salgados': '🥟',
  'Doces': '🍩',
  'Massas': '🍝',
  'Saladas': '🥗',
  'Carnes': '🥩',
  'Peixes': '🐟',
  'Sucos': '🧃',
};

export function CategoryGrid({ categories, products, onProductSelect }: CategoryGridProps) {
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  if (selectedCategory) {
    const categoryProducts = products.filter(p => p.category_id === selectedCategory.id);
    
    return (
      <div className="px-4 pb-32">
        {/* Back button + category name */}
        <div className="flex items-center gap-3 mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedCategory(null)}
            className="rounded-full h-10 w-10 shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-xl font-bold text-foreground">{selectedCategory.name}</h2>
          <span className="text-sm text-muted-foreground ml-auto">{categoryProducts.length} itens</span>
        </div>

        {/* Product list */}
        <div className="space-y-3">
          {categoryProducts.length > 0 ? (
            categoryProducts.map((product) => (
              <MenuProductCard
                key={product.id}
                product={product}
                onSelect={onProductSelect}
              />
            ))
          ) : (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">Nenhum produto nesta categoria</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pb-32">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-foreground">Categorias</h2>
        <span className="text-sm text-muted-foreground">{categories.length} categorias</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 justify-items-center">
        {categories.map((category, index) => {
          const gradient = categoryGradients[index % categoryGradients.length];
          const emoji = categoryEmojis[category.name] || '📦';
          const productCount = products.filter(p => p.category_id === category.id).length;

          return (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category)}
              className="group relative overflow-hidden rounded-xl transition-transform active:scale-95"
              style={{ width: '332px', height: '224px', maxWidth: '100%' }}
            >
              {/* Background: image or gradient */}
              {category.image_url ? (
                <>
                  <img
                    src={category.image_url}
                    alt={category.name}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                </>
              ) : (
                <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-90`} />
              )}

              {/* Content - centered */}
              <div className="relative z-10 flex flex-col items-center justify-center h-full p-2 text-white">
                <h3 className="text-base font-extrabold text-center leading-tight drop-shadow-md w-full">
                  {category.name}
                </h3>
                <span className="text-xs opacity-80 text-center mt-1">{productCount} itens</span>
              </div>

              {/* Shine effect on hover */}
              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-300" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
