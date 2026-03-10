import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useDrivers, useCreateDriver, useUpdateDriver, useDeleteDriver, Driver } from '@/hooks/useDrivers';
import { Plus, Pencil, Trash2, Truck, Phone, Loader2, ExternalLink } from 'lucide-react';

export default function Drivers() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [formData, setFormData] = useState({ name: '', phone: '', commission_percentage: '5' });

  const { toast } = useToast();
  const { data: drivers = [], isLoading } = useDrivers();
  const createMutation = useCreateDriver();
  const updateMutation = useUpdateDriver();
  const deleteMutation = useDeleteDriver();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingDriver) {
      updateMutation.mutate(
        { id: editingDriver.id, data: { name: formData.name, phone: formData.phone || null, commission_percentage: parseFloat(formData.commission_percentage) || 5 } },
        {
          onSuccess: () => {
            toast({ title: 'Entregador atualizado!' });
            setIsDialogOpen(false);
            setEditingDriver(null);
            setFormData({ name: '', phone: '', commission_percentage: '5' });
          },
          onError: () => toast({ title: 'Erro ao atualizar', variant: 'destructive' }),
        }
      );
    } else {
      createMutation.mutate({ name: formData.name, phone: formData.phone, commission_percentage: parseFloat(formData.commission_percentage) || 5 }, {
        onSuccess: () => {
          toast({ title: 'Entregador cadastrado com sucesso!' });
          setIsDialogOpen(false);
          setFormData({ name: '', phone: '', commission_percentage: '5' });
        },
        onError: () => toast({ title: 'Erro ao cadastrar', variant: 'destructive' }),
      });
    }
  };

  const openEditDialog = (driver: Driver) => {
    setEditingDriver(driver);
    setFormData({ name: driver.name, phone: driver.phone || '', commission_percentage: String(driver.commission_percentage ?? 5) });
    setIsDialogOpen(true);
  };

  const toggleActive = (driver: Driver) => {
    updateMutation.mutate({ id: driver.id, data: { is_active: !driver.is_active } });
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  return (
    <AdminLayout title="Entregadores">
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <p className="text-muted-foreground">Gerencie a equipe de entregadores</p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => window.open('/driver', '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Acesso Entregadores
            </Button>
            <Dialog
              open={isDialogOpen}
              onOpenChange={(open) => {
                setIsDialogOpen(open);
                if (!open) {
                  setEditingDriver(null);
                  setFormData({ name: '', phone: '', commission_percentage: '5' });
                }
              }}
            >
              <DialogTrigger asChild>
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Entregador
                </Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingDriver ? 'Editar Entregador' : 'Novo Entregador'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome</Label>
                  <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Nome do entregador" className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="phone">Telefone (opcional)</Label>
                  <Input id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })} placeholder="(11) 99999-9999" className="mt-1.5" maxLength={15} />
                </div>
                <div>
                  <Label htmlFor="commission">Comissão (%)</Label>
                  <Input id="commission" type="number" min="0" max="100" step="0.5" value={formData.commission_percentage} onChange={(e) => setFormData({ ...formData, commission_percentage: e.target.value })} placeholder="5" className="mt-1.5" />
                </div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
                  {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingDriver ? 'Salvar' : 'Cadastrar'}
                </Button>
              </form>
            </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Truck className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Entregadores Ativos</p>
                <p className="text-xl font-bold text-foreground">{drivers.filter((d) => d.is_active).length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <Truck className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Cadastrados</p>
                <p className="text-xl font-bold text-foreground">{drivers.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Entregadores</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : drivers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Truck className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum entregador cadastrado</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Comissão</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drivers.map((driver) => (
                    <TableRow key={driver.id}>
                      <TableCell className="font-medium">{driver.name}</TableCell>
                      <TableCell>
                        {driver.phone ? (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Phone className="w-3 h-3" />
                            {driver.phone}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{driver.commission_percentage ?? 5}%</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch checked={driver.is_active} onCheckedChange={() => toggleActive(driver)} />
                          <Badge variant={driver.is_active ? 'default' : 'secondary'}>{driver.is_active ? 'Ativo' : 'Inativo'}</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(driver)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remover entregador?</AlertDialogTitle>
                                <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteMutation.mutate(driver.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                  Remover
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
