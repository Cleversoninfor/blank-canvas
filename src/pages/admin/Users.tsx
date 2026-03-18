import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  useAdminUsers, useCreateAdminUser, useUpdateAdminUser, useDeleteAdminUser,
  AdminUser, PERM_KEYS, PERM_LABELS, PermKey, PermMap,
} from '@/hooks/useAdminUsers';
import { Plus, Pencil, Trash2, Key, Loader2, Users as UsersIcon } from 'lucide-react';

const defaultPerms = (): PermMap =>
  Object.fromEntries(PERM_KEYS.map(k => [k, false])) as PermMap;

export default function Users() {
  const { toast } = useToast();
  const { data: users, isLoading } = useAdminUsers();
  const createUser = useCreateAdminUser();
  const updateUser = useUpdateAdminUser();
  const deleteUser = useDeleteAdminUser();

  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [showPasswordDialog, setShowPasswordDialog] = useState<string | null>(null);

  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [permissions, setPermissions] = useState<PermMap>(defaultPerms());

  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState('');

  const resetForm = () => {
    setUsuario('');
    setSenha('');
    setConfirmarSenha('');
    setPermissions(defaultPerms());
    setEditingUser(null);
    setShowForm(false);
  };

  const openEdit = (user: AdminUser) => {
    setEditingUser(user);
    setUsuario(user.usuario);
    const perms = {} as PermMap;
    PERM_KEYS.forEach(k => { perms[k] = user[k]; });
    setPermissions(perms);
    setSenha('');
    setConfirmarSenha('');
    setShowForm(true);
  };

  const togglePerm = (key: PermKey) => {
    setPermissions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const selectAll = () => {
    setPermissions(Object.fromEntries(PERM_KEYS.map(k => [k, true])) as PermMap);
  };

  const deselectAll = () => {
    setPermissions(defaultPerms());
  };

  const handleSubmit = async () => {
    if (!usuario.trim()) {
      toast({ title: 'Erro', description: 'Informe o nome de usuário.', variant: 'destructive' });
      return;
    }

    if (!editingUser) {
      if (!senha || senha.length < 4) {
        toast({ title: 'Erro', description: 'Senha deve ter pelo menos 4 caracteres.', variant: 'destructive' });
        return;
      }
      if (senha !== confirmarSenha) {
        toast({ title: 'Erro', description: 'As senhas não coincidem.', variant: 'destructive' });
        return;
      }
      try {
        await createUser.mutateAsync({
          usuario: usuario.trim(),
          senha,
          permissions,
        });
        toast({ title: 'Sucesso', description: 'Usuário criado com sucesso.' });
        resetForm();
      } catch (e: any) {
        toast({ title: 'Erro', description: e.message || 'Erro ao criar usuário.', variant: 'destructive' });
      }
    } else {
      try {
        await updateUser.mutateAsync({
          id: editingUser.id,
          usuario: usuario.trim(),
          permissions,
        });
        toast({ title: 'Sucesso', description: 'Usuário atualizado.' });
        resetForm();
      } catch (e: any) {
        toast({ title: 'Erro', description: e.message || 'Erro ao atualizar.', variant: 'destructive' });
      }
    }
  };

  const handleChangePassword = async () => {
    if (!novaSenha || novaSenha.length < 4) {
      toast({ title: 'Erro', description: 'Senha deve ter pelo menos 4 caracteres.', variant: 'destructive' });
      return;
    }
    if (novaSenha !== confirmarNovaSenha) {
      toast({ title: 'Erro', description: 'As senhas não coincidem.', variant: 'destructive' });
      return;
    }
    try {
      await updateUser.mutateAsync({ id: showPasswordDialog!, senha: novaSenha });
      toast({ title: 'Sucesso', description: 'Senha alterada.' });
      setShowPasswordDialog(null);
      setNovaSenha('');
      setConfirmarNovaSenha('');
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) return;
    try {
      await deleteUser.mutateAsync(id);
      toast({ title: 'Sucesso', description: 'Usuário excluído.' });
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
  };

  const PermissionBadges = ({ user }: { user: AdminUser }) => {
    const activePerms = PERM_KEYS.filter(k => user[k]);
    if (activePerms.length === 0) {
      return <Badge variant="outline" className="text-xs text-muted-foreground">Sem permissões</Badge>;
    }
    if (activePerms.length === PERM_KEYS.length) {
      return <Badge variant="secondary" className="text-xs">Acesso total</Badge>;
    }
    return (
      <div className="flex flex-wrap gap-1">
        {activePerms.map(k => (
          <Badge key={k} variant="secondary" className="text-xs">{PERM_LABELS[k]}</Badge>
        ))}
      </div>
    );
  };

  return (
    <AdminLayout title="Usuários">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UsersIcon className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Gerenciamento de Usuários</h2>
          </div>
          <Button onClick={() => { resetForm(); setShowForm(true); }} size="sm">
            <Plus className="h-4 w-4 mr-1" /> Novo Usuário
          </Button>
        </div>

        {showForm && (
          <Card className="admin-card">
            <CardHeader>
              <CardTitle className="text-base">
                {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Usuário</Label>
                  <Input value={usuario} onChange={e => setUsuario(e.target.value)} placeholder="Nome de login" />
                </div>
                {!editingUser && (
                  <>
                    <div className="space-y-2">
                      <Label>Senha</Label>
                      <Input type="password" value={senha} onChange={e => setSenha(e.target.value)} placeholder="Senha" />
                    </div>
                    <div className="space-y-2">
                      <Label>Confirmar Senha</Label>
                      <Input type="password" value={confirmarSenha} onChange={e => setConfirmarSenha(e.target.value)} placeholder="Confirmar senha" />
                    </div>
                  </>
                )}
              </div>

              {/* Per-menu permissions */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Permissões de acesso</Label>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" type="button" onClick={selectAll}>Selecionar todos</Button>
                    <Button variant="outline" size="sm" type="button" onClick={deselectAll}>Desmarcar todos</Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {PERM_KEYS.map(key => (
                    <label
                      key={key}
                      className="flex items-center gap-2 rounded-lg border p-3 cursor-pointer hover:bg-accent/50 transition-colors"
                    >
                      <Checkbox
                        checked={permissions[key]}
                        onCheckedChange={() => togglePerm(key)}
                      />
                      <span className="text-sm font-medium">{PERM_LABELS[key]}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSubmit} disabled={createUser.isPending || updateUser.isPending}>
                  {(createUser.isPending || updateUser.isPending) && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  {editingUser ? 'Salvar' : 'Criar Usuário'}
                </Button>
                <Button variant="outline" onClick={resetForm}>Cancelar</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !users?.length ? (
          <Card className="admin-card">
            <CardContent className="py-8 text-center text-muted-foreground">
              Nenhum usuário cadastrado.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {users.map(user => (
              <Card key={user.id} className="admin-card">
                <CardContent className="flex items-center justify-between py-3 px-4">
                  <div className="space-y-1">
                    <p className="font-medium text-sm">{user.usuario}</p>
                    {user.login_email && (
                      <p className="text-xs text-muted-foreground">Login: {user.login_email}</p>
                    )}
                    <PermissionBadges user={user} />
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(user)} title="Editar">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => { setShowPasswordDialog(user.id); setNovaSenha(''); setConfirmarNovaSenha(''); }} title="Alterar senha">
                      <Key className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(user.id)} title="Excluir" className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!showPasswordDialog} onOpenChange={() => setShowPasswordDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Senha</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Nova Senha</Label>
              <Input type="password" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} placeholder="Nova senha" />
            </div>
            <div className="space-y-2">
              <Label>Confirmar Nova Senha</Label>
              <Input type="password" value={confirmarNovaSenha} onChange={e => setConfirmarNovaSenha(e.target.value)} placeholder="Confirmar nova senha" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordDialog(null)}>Cancelar</Button>
            <Button onClick={handleChangePassword} disabled={updateUser.isPending}>
              {updateUser.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Alterar Senha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
