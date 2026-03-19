import { useState } from 'react';
import { Plus, Pencil, Trash2, Loader2, Search, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { ImageUpload } from '@/components/admin/ImageUpload';
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct, useProductIngredients, useUpdateProductIngredients, Product } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { useIngredients } from '@/hooks/useIngredients';
import { useAddonGroups, useAddProductAddonGroup, useRemoveProductAddonGroup } from '@/hooks/useAddons';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const AdminProducts = () => {
  const { data: products, isLoading } = useProducts();
  const { data: categories } = useCategories();
  const { data: addonGroups } = useAddonGroups();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const addProductAddonGroup = useAddProductAddonGroup();
  const removeProductAddonGroup = useRemoveProductAddonGroup();
  const { data: ingredients } = useIngredients();
  const updateProductIngredients = useUpdateProductIngredients();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category_id: '',
    image_url: '',
    is_available: true,
    stock_mode: 'none' as 'simple' | 'ingredients' | 'none',
    stock_quantity: '',
    min_stock: '',
  });
  const [selectedAddonGroups, setSelectedAddonGroups] = useState<string[]>([]);
  const [initialAddonGroups, setInitialAddonGroups] = useState<string[]>([]);
  const [composition, setComposition] = useState<{ ingredient_id: string; quantity_used: string }[]>([]);
  const [loadingAddons, setLoadingAddons] = useState(false);
  const [loadingComposition, setLoadingComposition] = useState(false);

  const filteredProducts = products?.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const formatCurrency = (value: number) =>
    Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const openCreateModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      description: '',
      price: '',
      category_id: '',
      image_url: '',
      is_available: true,
      stock_mode: 'none',
      stock_quantity: '0',
      min_stock: '0',
    });
    setSelectedAddonGroups([]);
    setComposition([]);
    setIsModalOpen(true);
  };

  const openEditModal = async (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      category_id: product.category_id || '',
      image_url: product.image_url || '',
      is_available: product.is_available,
      stock_mode: product.stock_mode || 'none',
      stock_quantity: (product.stock_quantity || 0).toString(),
      min_stock: (product.min_stock || 0).toString(),
    });
    setIsModalOpen(true);
    
    // Fetch product addon groups
    setLoadingAddons(true);
    setLoadingComposition(true);
    try {
      // Addons
      const { data: addonsData, error: addonsError } = await supabase
        .from('product_addon_groups')
        .select('addon_group_id')
        .eq('product_id', product.id);
      
      if (addonsError) throw addonsError;
      
      const groupIds = addonsData?.map(pag => pag.addon_group_id) || [];
      setSelectedAddonGroups(groupIds);
      setInitialAddonGroups(groupIds);

      // Composition
      const { data: compData, error: compError } = await supabase
        .from('product_ingredients')
        .select('ingredient_id, quantity_used')
        .eq('product_id', product.id);
      
      if (compError) throw compError;
      setComposition(compData?.map(c => ({ 
        ingredient_id: c.ingredient_id, 
        quantity_used: c.quantity_used.toString() 
      })) || []);

    } catch (error) {
      console.error('Error fetching details:', error);
    } finally {
      setLoadingAddons(false);
      setLoadingComposition(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({ title: 'Nome é obrigatório', variant: 'destructive' });
      return;
    }

    const price = parseFloat(formData.price.replace(',', '.'));
    if (isNaN(price) || price <= 0) {
      toast({ title: 'Preço inválido', variant: 'destructive' });
      return;
    }

    try {
      const productData = {
        name: formData.name,
        description: formData.description || null,
        price,
        category_id: formData.category_id || null,
        image_url: formData.image_url || null,
        is_available: formData.is_available,
        stock_mode: formData.stock_mode,
        stock_quantity: parseFloat(formData.stock_quantity.replace(',', '.')) || 0,
        min_stock: parseFloat(formData.min_stock.replace(',', '.')) || 0,
      };

      let productId: string;
      
      if (editingProduct) {
        await updateProduct.mutateAsync({ id: editingProduct.id, ...productData });
        productId = editingProduct.id;
        
        // Sync addon groups - remove old, add new
        const toRemove = initialAddonGroups.filter(id => !selectedAddonGroups.includes(id));
        const toAdd = selectedAddonGroups.filter(id => !initialAddonGroups.includes(id));
        
        for (const groupId of toRemove) {
          await removeProductAddonGroup.mutateAsync({ product_id: productId, addon_group_id: groupId });
        }
        for (const groupId of toAdd) {
          await addProductAddonGroup.mutateAsync({ product_id: productId, addon_group_id: groupId });
        }

        // Sync composition
        await updateProductIngredients.mutateAsync({
          productId,
          ingredients: composition.map(c => ({
            ingredient_id: c.ingredient_id,
            quantity_used: parseFloat(c.quantity_used.replace(',', '.')) || 0
          }))
        });
        
        toast({ title: 'Produto atualizado!' });
      } else {
        const result = await createProduct.mutateAsync(productData);
        productId = result.id;
        
        // Add selected addon groups
        for (const groupId of selectedAddonGroups) {
          await addProductAddonGroup.mutateAsync({ product_id: productId, addon_group_id: groupId });
        }

        // Add composition
        await updateProductIngredients.mutateAsync({
          productId,
          ingredients: composition.map(c => ({
            ingredient_id: c.ingredient_id,
            quantity_used: parseFloat(c.quantity_used.replace(',', '.')) || 0
          }))
        });
        
        toast({ title: 'Produto criado!' });
      }

      setIsModalOpen(false);
    } catch (error: any) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    }
  };
  
  const toggleAddonGroup = (groupId: string) => {
    setSelectedAddonGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handleDelete = async (product: Product) => {
    if (!confirm(`Deseja excluir "${product.name}"?`)) return;

    try {
      await deleteProduct.mutateAsync(product.id);
      toast({ title: 'Produto excluído!' });
    } catch (error: any) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    }
  };

  const toggleAvailability = async (product: Product) => {
    try {
      await updateProduct.mutateAsync({
        id: product.id,
        is_available: !product.is_available,
      });
      toast({ 
        title: product.is_available ? 'Produto desativado' : 'Produto ativado',
      });
    } catch (error: any) {
      toast({ title: 'Erro ao atualizar', variant: 'destructive' });
    }
  };

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return 'Sem categoria';
    return categories?.find(c => c.id === categoryId)?.name || 'Sem categoria';
  };

  if (isLoading) {
    return (
      <AdminLayout title="Produtos">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Produtos">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar produtos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={openCreateModal} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Novo Produto
        </Button>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {filteredProducts.map((product) => (
          <div 
            key={product.id} 
            className="bg-card rounded-xl p-3 sm:p-4 shadow-card"
          >
            <div className="flex gap-3 sm:gap-4">
              <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-2xl sm:text-3xl">🍔</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-foreground text-sm sm:text-base truncate">{product.name}</h3>
                  <Badge variant={product.is_available ? 'open' : 'closed'} className="text-[10px] sm:text-xs flex-shrink-0">
                    {product.is_available ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-1 truncate">
                  {getCategoryName(product.category_id)}
                </p>
                <p className="font-bold text-primary text-sm sm:text-base">{formatCurrency(product.price)}</p>
              </div>
            </div>
            
            <div className="flex gap-2 mt-3 sm:mt-4">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 text-xs sm:text-sm h-8 sm:h-9"
                onClick={() => toggleAvailability(product)}
              >
                {product.is_available ? (
                  <><ToggleRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" /> <span className="hidden xs:inline">Desativar</span><span className="xs:hidden">Off</span></>
                ) : (
                  <><ToggleLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" /> <span className="hidden xs:inline">Ativar</span><span className="xs:hidden">On</span></>
                )}
              </Button>
              <Button variant="action-icon" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" onClick={() => openEditModal(product)}>
                <Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
              <Button variant="action-icon-destructive" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" onClick={() => handleDelete(product)}>
                <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            </div>
          </div>
        ))}

        {filteredProducts.length === 0 && (
          <div className="col-span-full py-12 text-center">
            <p className="text-muted-foreground">Nenhum produto encontrado</p>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? 'Editar Produto' : 'Novo Produto'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <ImageUpload
                bucket="product-images"
                currentUrl={formData.image_url}
                onUpload={(url) => setFormData({ ...formData, image_url: url })}
                onRemove={() => setFormData({ ...formData, image_url: '' })}
              />
              <p className="text-xs text-muted-foreground">
                <strong>Recomendado:</strong> 400×400 pixels (quadrada, PNG ou JPG).
              </p>
            </div>

            <div>
              <label className="text-sm text-muted-foreground">Nome *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nome do produto"
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground">Descrição</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição do produto"
                className="mt-1"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground">Preço *</label>
                <Input
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="0,00"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Categoria</label>
                <Select
                  value={formData.category_id}
                  onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Stock Control */}
            <div className="space-y-3 pt-2 border-t border-border">
              <label className="text-sm font-semibold text-foreground uppercase tracking-wider">Controle de Estoque</label>
              
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'none', label: 'Inativo' },
                  { id: 'simple', label: 'Unidade' },
                  { id: 'ingredients', label: 'Ingredientes' }
                ].map((mode) => (
                  <Button
                    key={mode.id}
                    type="button"
                    variant={formData.stock_mode === mode.id ? 'default' : 'outline'}
                    className="text-xs h-9"
                    onClick={() => setFormData({ ...formData, stock_mode: mode.id as any })}
                  >
                    {mode.label}
                  </Button>
                ))}
              </div>

              {formData.stock_mode === 'simple' && (
                <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                  <div>
                    <label className="text-sm text-muted-foreground">Qtd em Estoque</label>
                    <Input
                      type="number"
                      step="0.001"
                      value={formData.stock_quantity}
                      onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                      placeholder="0.000"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Estoque Mínimo</label>
                    <Input
                      type="number"
                      step="0.001"
                      value={formData.min_stock}
                      onChange={(e) => setFormData({ ...formData, min_stock: e.target.value })}
                      placeholder="0.000"
                      className="mt-1"
                    />
                  </div>
                </div>
              )}

              {formData.stock_mode === 'ingredients' && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-muted-foreground">Composição do Produto</label>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 text-xs text-primary"
                      onClick={() => setComposition([...composition, { ingredient_id: '', quantity_used: '0' }])}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Add Ingrediente
                    </Button>
                  </div>

                  {loadingComposition ? (
                    <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
                  ) : (
                    <div className="space-y-2">
                      {composition.map((comp, idx) => (
                        <div key={idx} className="flex gap-2 items-end bg-muted/30 p-2 rounded-lg relative group">
                          <div className="flex-1">
                            <label className="text-[10px] uppercase text-muted-foreground select-none">Ingrediente</label>
                            <Select
                              value={comp.ingredient_id}
                              onValueChange={(val) => {
                                const newComp = [...composition];
                                newComp[idx].ingredient_id = val;
                                setComposition(newComp);
                              }}
                            >
                              <SelectTrigger className="h-8 text-xs bg-background">
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent>
                                {ingredients?.map((ing) => (
                                  <SelectItem key={ing.id} value={ing.id} className="text-xs">
                                    {ing.name} ({ing.unit})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="w-24">
                            <label className="text-[10px] uppercase text-muted-foreground select-none">Qtd. Uso</label>
                            <Input
                              value={comp.quantity_used}
                              onChange={(e) => {
                                const newComp = [...composition];
                                newComp[idx].quantity_used = e.target.value;
                                setComposition(newComp);
                              }}
                              placeholder="0.000"
                              className="h-8 text-xs bg-background"
                            />
                          </div>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => setComposition(composition.filter((_, i) => i !== idx))}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                      {composition.length === 0 && (
                        <p className="text-center py-4 text-xs text-muted-foreground border-2 border-dashed border-muted rounded-lg">
                          Nenhum ingrediente adicionado.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Addon Groups Selection */}
            {addonGroups && addonGroups.length > 0 && (
              <div>
                <label className="text-sm text-muted-foreground">Grupos de Acréscimos</label>
                {loadingAddons ? (
                  <div className="mt-2 flex items-center justify-center p-4 bg-muted/50 rounded-lg">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="mt-2 space-y-2 bg-muted/50 rounded-lg p-3">
                    {addonGroups.map((group) => (
                      <div key={group.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`addon-${group.id}`}
                          checked={selectedAddonGroups.includes(group.id)}
                          onCheckedChange={() => toggleAddonGroup(group.id)}
                        />
                        <Label
                          htmlFor={`addon-${group.id}`}
                          className="text-sm font-normal cursor-pointer flex-1"
                        >
                          {group.title}
                          <span className="text-muted-foreground ml-1 text-xs">
                            ({group.name})
                          </span>
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Selecione os grupos de acréscimos que aparecerão neste produto
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createProduct.isPending || updateProduct.isPending}>
                {(createProduct.isPending || updateProduct.isPending) && (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                )}
                {editingProduct ? 'Salvar' : 'Criar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminProducts;
