import { useState } from 'react';
import { Plus, Pencil, Trash2, Loader2, Search, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useIngredients, useCreateIngredient, useUpdateIngredient, useDeleteIngredient, Ingredient } from '@/hooks/useIngredients';
import { useToast } from '@/hooks/use-toast';

const AdminIngredients = () => {
  const { data: ingredients, isLoading } = useIngredients();
  const createIngredient = useCreateIngredient();
  const updateIngredient = useUpdateIngredient();
  const deleteIngredient = useDeleteIngredient();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    stock_quantity: '',
    unit: 'un',
    min_stock: '',
  });

  const filteredIngredients = ingredients?.filter(i => 
    i.name.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const openCreateModal = () => {
    setEditingIngredient(null);
    setFormData({
      name: '',
      stock_quantity: '0',
      unit: 'un',
      min_stock: '0',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (ingredient: Ingredient) => {
    setEditingIngredient(ingredient);
    setFormData({
      name: ingredient.name,
      stock_quantity: ingredient.stock_quantity.toString(),
      unit: ingredient.unit,
      min_stock: ingredient.min_stock.toString(),
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({ title: 'Nome é obrigatório', variant: 'destructive' });
      return;
    }

    const stock_quantity = parseFloat(formData.stock_quantity.replace(',', '.'));
    const min_stock = parseFloat(formData.min_stock.replace(',', '.'));

    try {
      const data = {
        name: formData.name,
        stock_quantity: isNaN(stock_quantity) ? 0 : stock_quantity,
        unit: formData.unit,
        min_stock: isNaN(min_stock) ? 0 : min_stock,
      };

      if (editingIngredient) {
        await updateIngredient.mutateAsync({ id: editingIngredient.id, ...data });
        toast({ title: 'Ingrediente atualizado!' });
      } else {
        await createIngredient.mutateAsync(data);
        toast({ title: 'Ingrediente criado!' });
      }

      setIsModalOpen(false);
    } catch (error: any) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (ingredient: Ingredient) => {
    if (!confirm(`Deseja excluir "${ingredient.name}"? Isso pode afetar produtos que usam este ingrediente.`)) return;

    try {
      await deleteIngredient.mutateAsync(ingredient.id);
      toast({ title: 'Ingrediente excluído!' });
    } catch (error: any) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <AdminLayout title="Ingredientes">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Ingredientes">
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar ingredientes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={openCreateModal} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Novo Ingrediente
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {filteredIngredients.map((ingredient) => (
          <div key={ingredient.id} className="bg-card rounded-xl p-4 shadow-card">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{ingredient.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    Estoque: <span className={ingredient.stock_quantity <= ingredient.min_stock ? "text-destructive font-bold" : ""}>
                      {ingredient.stock_quantity} {ingredient.unit}
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditModal(ingredient)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(ingredient)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}

        {filteredIngredients.length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground">
            Benhum ingrediente encontrado
          </div>
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {editingIngredient ? 'Editar Ingrediente' : 'Novo Ingrediente'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground">Nome *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Carne moída, Pão de hambúrguer"
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground">Qtd em Estoque</label>
                <Input
                  value={formData.stock_quantity}
                  onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                  placeholder="0.000"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Unidade</label>
                <select
                  className="w-full mt-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                >
                  <option value="un">un (unidade)</option>
                  <option value="kg">kg (quilo)</option>
                  <option value="g">g (grama)</option>
                  <option value="L">l (litro)</option>
                  <option value="ml">ml (mililitro)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm text-muted-foreground">Estoque Mínimo</label>
              <Input
                value={formData.min_stock}
                onChange={(e) => setFormData({ ...formData, min_stock: e.target.value })}
                placeholder="0.000"
                className="mt-1"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createIngredient.isPending || updateIngredient.isPending}>
                {editingIngredient ? 'Salvar' : 'Criar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminIngredients;
