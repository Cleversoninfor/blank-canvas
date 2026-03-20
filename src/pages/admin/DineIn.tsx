import { useState } from 'react';
import { Plus, Trash2, Edit2, UtensilsCrossed, MapPin } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useDineInTables, useCreateDineInTable, useUpdateDineInTable, useDeleteDineInTable, DineInTable } from '@/hooks/useDineInTables';
import { toast } from 'sonner';

const DineIn = () => {
  const { data: tables, isLoading } = useDineInTables();
  const createTable = useCreateDineInTable();
  const updateTable = useUpdateDineInTable();
  const deleteTable = useDeleteDineInTable();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DineInTable | null>(null);
  const [formNumber, setFormNumber] = useState('');
  const [formLocation, setFormLocation] = useState('');

  const openCreate = () => {
    setEditing(null);
    setFormNumber('');
    setFormLocation('');
    setDialogOpen(true);
  };

  const openEdit = (table: DineInTable) => {
    setEditing(table);
    setFormNumber(String(table.number));
    setFormLocation(table.location || '');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const num = parseInt(formNumber);
    if (!num || num <= 0) {
      toast.error('Número da mesa é obrigatório');
      return;
    }

    try {
      if (editing) {
        await updateTable.mutateAsync({ id: editing.id, number: num, location: formLocation || undefined });
        toast.success('Mesa atualizada');
      } else {
        await createTable.mutateAsync({ number: num, location: formLocation || undefined });
        toast.success('Mesa criada');
      }
      setDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir esta mesa?')) return;
    try {
      await deleteTable.mutateAsync(id);
      toast.success('Mesa excluída');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao excluir');
    }
  };

  return (
    <AdminLayout title="Consumir no Local">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <UtensilsCrossed className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Mesas</h1>
              <p className="text-muted-foreground text-sm">Cadastre e gerencie as mesas para consumo no local</p>
            </div>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Mesa
          </Button>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-muted-foreground">Carregando...</div>
        ) : !tables || tables.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <UtensilsCrossed className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground mb-4">Nenhuma mesa cadastrada</p>
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Cadastrar primeira mesa
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tables.map((table) => (
              <Card key={table.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <span className="text-lg font-bold text-primary">{table.number}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">Mesa {table.number}</p>
                        {table.location && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {table.location}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(table)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(table.id)} className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Mesa' : 'Nova Mesa'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Número da mesa *</label>
              <Input
                type="number"
                min={1}
                placeholder="Ex: 1"
                value={formNumber}
                onChange={(e) => setFormNumber(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Localização (opcional)</label>
              <Input
                placeholder="Ex: Interno, Externo, Varanda"
                value={formLocation}
                onChange={(e) => setFormLocation(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={createTable.isPending || updateTable.isPending}>
              {editing ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default DineIn;
