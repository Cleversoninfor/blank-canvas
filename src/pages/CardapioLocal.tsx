import { useState, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { LocalHeroHeader } from '@/components/menu/LocalHeroHeader';
import { CategoryIcons } from '@/components/menu/CategoryIcons';
import { CategoryGrid } from '@/components/menu/CategoryGrid';
import { MenuSection } from '@/components/menu/MenuSection';
import { ReadOnlyProductCard } from '@/components/menu/ReadOnlyProductCard';
import { InfornexaBanner } from '@/components/menu/InfornexaBanner';
import { useStoreConfig } from '@/hooks/useStore';
import { useCategories } from '@/hooks/useCategories';
import { useProducts, Product } from '@/hooks/useProducts';
import { useTheme } from '@/hooks/useTheme';
import { Loader2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

const CardapioLocal = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const sectionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const { data: store, isLoading: storeLoading } = useStoreConfig();
  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const { data: products, isLoading: productsLoading } = useProducts();

  useTheme();

  const isLoading = storeLoading || categoriesLoading || productsLoading;

  const scrollToCategory = (categoryId: string) => {
    const element = sectionRefs.current[categoryId];
    if (element) {
      const headerOffset = 100;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.scrollY - headerOffset;
      window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
    }
  };

  // No-op handler for components that require onProductSelect
  const noOp = (_product: Product) => {};

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando cardápio...</p>
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Restaurante não configurado</p>
      </div>
    );
  }

  const filteredProducts = products?.filter(product =>
    searchQuery === '' ||
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  ) || [];

  const productsByCategory = categories?.map(category => ({
    category,
    products: filteredProducts.filter(p => p.category_id === category.id)
  })).filter(group => group.products.length > 0) || [];

  const totalItems = filteredProducts.length;
  const menuLayout = store?.menu_layout || 'list';
  const isCategoryMode = menuLayout === 'category';

  return (
    <>
      <Helmet>
        <title>{store.name} - Cardápio</title>
        <meta name="description" content={`Cardápio digital do ${store.name}. Confira nossos produtos.`} />
      </Helmet>

      <div className="min-h-screen bg-background pb-12">
        <LocalHeroHeader store={store} />
        

        {isCategoryMode ? (
          <>
            <div className="px-4 mt-4">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Procurar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-12 w-full rounded-xl border border-border bg-card pl-4 pr-12 shadow-sm placeholder:text-muted-foreground focus:ring-2 focus:ring-primary"
                />
                <Search className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>

            <div className="pt-4">
              {searchQuery ? (
                <div className="px-4 pb-12 space-y-3">
                  <h2 className="text-lg font-bold text-foreground mb-3">Resultados</h2>
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map((product) => (
                      <ReadOnlyProductCard key={product.id} product={product} />
                    ))
                  ) : (
                    <div className="py-12 text-center">
                      <p className="text-muted-foreground">Nenhum produto encontrado</p>
                    </div>
                  )}
                </div>
              ) : (
                <CategoryGrid
                  categories={categories || []}
                  products={products || []}
                  onProductSelect={noOp}
                />
              )}
            </div>
          </>
        ) : (
          <>
            <div className="px-4 mt-4">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Procurar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-12 w-full rounded-xl border border-border bg-card pl-4 pr-12 shadow-sm placeholder:text-muted-foreground focus:ring-2 focus:ring-primary"
                />
                <Search className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>

            {categories && categories.length > 0 && (
              <CategoryIcons categories={categories} onCategorySelect={scrollToCategory} />
            )}

            <div className="px-4 pt-2 pb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Cardápio</h2>
              <span className="text-sm text-muted-foreground">{totalItems} itens</span>
            </div>

            <div className="px-4 space-y-6">
              {productsByCategory.map(({ category, products }) => (
                <div
                  key={category.id}
                  ref={(el) => { sectionRefs.current[category.id] = el; }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-base font-bold text-foreground">{category.name}</h3>
                  </div>
                  <div className="space-y-3">
                    {products.map((product) => (
                      <ReadOnlyProductCard key={product.id} product={product} />
                    ))}
                  </div>
                </div>
              ))}

              {productsByCategory.length === 0 && (
                <div className="py-12 text-center">
                  <p className="text-muted-foreground">
                    {searchQuery ? 'Nenhum produto encontrado' : 'Nenhum produto cadastrado ainda'}
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        <InfornexaBanner />
      </div>
    </>
  );
};

export default CardapioLocal;
