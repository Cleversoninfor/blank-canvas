import { useState } from 'react';
import { Plus, Trash2, Hash, Loader2, Receipt } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useComandas, useCreateComanda, useDeleteComanda } from '@/hooks/useComandas';

const AdminComandas = () => {
  const { toast } = useToast();
  const { data: comandas = [], isLoading: loadingComandas } = useComandas();
  const createComanda = useCreateComanda();
  const deleteComanda = useDeleteComanda();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newNumero, setNewNumero] = useState('');

  const handleCreateComanda = async () => {
    const num = parseInt(newNumero);
    if (isNaN(num) || num <= 0) {
      toast({ title: 'Número inválido', description: 'Informe um número válido.', variant: 'destructive' });
      return;
    }
    try {
      await createComanda.mutateAsync(num);
      toast({ title: 'Comanda criada', description: `Comanda #${num} criada com sucesso.` });
      setNewNumero('');
      setShowCreateForm(false);
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err.message?.includes('unique') ? 'Já existe uma comanda com esse número.' : err.message,
        variant: 'destructive',
      });
    }
  };

  const handleDeleteComanda = async (comandaId: string, numero: number) => {
    try {
      await deleteComanda.mutateAsync(comandaId);
      toast({ title: 'Comanda excluída', description: `Comanda #${numero} removida.` });
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <AdminLayout title="Gerenciar Comandas">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="admin-card border-none shadow-xl">
          <CardHeader className="bg-primary/5 pb-4">
            <CardTitle className="flex items-center gap-3 text-lg font-bold">
              <div className="p-2 bg-primary/20 rounded-lg text-primary">
                <Hash className="h-5 w-5" />
              </div>
              Controle de Comandas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {!showCreateForm ? (
              <Button onClick={() => setShowCreateForm(true)} className="w-full" size="lg">
                <Plus className="h-5 w-5 mr-2" />
                Criar Nova Comanda
              </Button>
            ) : (
              <div className="flex gap-3 flex-col sm:flex-row">
                <Input
                  type="number"
                  placeholder="Informe o número da comanda"
                  value={newNumero}
                  onChange={e => setNewNumero(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreateComanda()}
                  className="h-12 text-lg"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button onClick={handleCreateComanda} disabled={createComanda.isPending} size="lg" className="flex-1">
                    {createComanda.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Criar'}
                  </Button>
                  <Button variant="ghost" onClick={() => { setShowCreateForm(false); setNewNumero(''); }} size="lg">
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            <div className="border-t border-border pt-6">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                Comandas Cadastradas ({comandas.length})
              </h3>

              {loadingComandas ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : comandas.length === 0 ? (
                <div className="py-12 text-center bg-muted/20 rounded-2xl border-2 border-dashed border-border/50">
                  <Receipt className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">Nenhuma comanda criada até o momento.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {comandas.map(comanda => (
                    <div 
                      key={comanda.id} 
                      className="flex items-center justify-between p-4 rounded-2xl bg-muted/40 border border-border/50 hover:bg-muted/60 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                          <Receipt className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-bold text-lg">Comanda #{comanda.numero_comanda}</p>
                          <Badge variant={comanda.status === 'livre' ? 'default' : 'destructive'} className="text-[10px] uppercase font-bold px-2 py-0">
                            {comanda.status === 'livre' ? 'Livre' : 'Ocupada'}
                          </Badge>
                        </div>
                      </div>
                      
                      {comanda.status === 'livre' && (
                        <Button
                          variant="action-icon-destructive"
                          size="icon"
                          onClick={() => handleDeleteComanda(comanda.id, comanda.numero_comanda)}
                          disabled={deleteComanda.isPending}
                          title="Excluir comanda"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminComandas;
