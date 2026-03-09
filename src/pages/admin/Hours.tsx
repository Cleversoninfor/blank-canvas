import { useState } from 'react';
import { Loader2, Clock, Plus, Pencil, Check, X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useBusinessHours, useUpdateBusinessHour, useCreateBusinessHours, useDeleteBusinessHour, getDayName, BusinessHour } from '@/hooks/useBusinessHours';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

const AdminHours = () => {
  const { data: hours, isLoading } = useBusinessHours();
  const updateHour = useUpdateBusinessHour();
  const createHours = useCreateBusinessHours();
  const deleteHour = useDeleteBusinessHour();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({
    open_time: '',
    close_time: '',
  });

  const handleEdit = (hour: BusinessHour) => {
    setEditingId(hour.id);
    setEditData({
      open_time: hour.open_time,
      close_time: hour.close_time,
    });
  };

  const handleSave = async (hour: BusinessHour) => {
    try {
      await updateHour.mutateAsync({
        id: hour.id,
        open_time: editData.open_time,
        close_time: editData.close_time,
      });
      setEditingId(null);
      toast({ title: 'Horário atualizado!' });
    } catch (error: any) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    }
  };

  const toggleActive = async (hour: BusinessHour) => {
    try {
      await updateHour.mutateAsync({
        id: hour.id,
        is_active: !hour.is_active,
      });
      toast({ title: hour.is_active ? 'Horário desativado' : 'Horário ativado' });
    } catch (error) {
      toast({ title: 'Erro ao atualizar', variant: 'destructive' });
    }
  };

  const handleCreateHours = async () => {
    try {
      await createHours.mutateAsync();
      toast({ title: 'Horários criados com sucesso!' });
    } catch (error: any) {
      toast({ title: 'Erro ao criar horários', description: error.message, variant: 'destructive' });
    }
  };

  const handleAddSlot = async (dayOfWeek: number) => {
    try {
      const { error } = await supabase
        .from('business_hours')
        .insert({
          day_of_week: dayOfWeek,
          open_time: '12:00',
          close_time: '14:00',
          is_active: true,
        });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['business-hours'] });
      toast({ title: 'Horário adicionado!' });
    } catch (error: any) {
      toast({ title: 'Erro ao adicionar', description: error.message, variant: 'destructive' });
    }
  };

  const handleDeleteSlot = async (id: string) => {
    try {
      await deleteHour.mutateAsync(id);
      toast({ title: 'Horário removido!' });
    } catch (error: any) {
      toast({ title: 'Erro ao remover', description: error.message, variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <AdminLayout title="Horários">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (!hours || hours.length === 0) {
    return (
      <AdminLayout title="Horários de Funcionamento">
        <div className="w-full max-w-2xl">
          <div className="flex items-center gap-3 mb-4 sm:mb-6 p-3 sm:p-4 bg-primary/10 rounded-xl">
            <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="font-medium text-foreground text-sm sm:text-base">Configure os horários de funcionamento</p>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Defina quando sua loja está aberta para receber pedidos
              </p>
            </div>
          </div>

          <div className="bg-card rounded-xl shadow-card p-6 sm:p-8 text-center">
            <Clock className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-base sm:text-lg font-medium text-foreground mb-2">Nenhum horário cadastrado</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Clique no botão abaixo para criar os horários de funcionamento para todos os dias da semana.
            </p>
            <Button onClick={handleCreateHours} disabled={createHours.isPending}>
              {createHours.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Criar Horários
            </Button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // Group hours by day_of_week
  const hoursByDay: Record<number, BusinessHour[]> = {};
  for (let d = 0; d < 7; d++) {
    hoursByDay[d] = hours.filter(h => h.day_of_week === d);
  }

  return (
    <AdminLayout title="Horários de Funcionamento">
      <div className="w-full max-w-2xl">
        <div className="flex items-center gap-3 mb-4 sm:mb-6 p-3 sm:p-4 bg-primary/10 rounded-xl">
          <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" />
          <div className="min-w-0">
            <p className="font-medium text-foreground text-sm sm:text-base">Configure os horários de funcionamento</p>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Defina quando sua loja está aberta. Adicione múltiplos horários por dia.
            </p>
          </div>
        </div>

        <div className="bg-card rounded-xl shadow-card overflow-hidden">
          {[0, 1, 2, 3, 4, 5, 6].map((day) => {
            const daySlots = hoursByDay[day] || [];
            const hasSlots = daySlots.length > 0;

            return (
              <div key={day} className="border-b border-border last:border-0 p-3 sm:p-4">
                {/* Day header */}
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-foreground text-sm sm:text-base">
                    {getDayName(day)}
                  </p>
                  {!hasSlots && (
                    <span className="text-xs text-muted-foreground">Sem horários</span>
                  )}
                </div>

                {/* Time slots */}
                <div className="space-y-2">
                  {daySlots.map((hour, idx) => (
                    <div
                      key={hour.id}
                      className={cn(
                        "flex items-center gap-2 sm:gap-3 pl-2",
                        !hour.is_active && "opacity-50"
                      )}
                    >
                      <Switch
                        checked={hour.is_active}
                        onCheckedChange={() => toggleActive(hour)}
                        className="shrink-0"
                      />

                      {editingId === hour.id ? (
                        <div className="flex items-center gap-2 flex-1">
                          <Input
                            type="time"
                            value={editData.open_time}
                            onChange={(e) => setEditData({ ...editData, open_time: e.target.value })}
                            className="w-full sm:w-28"
                          />
                          <span className="text-muted-foreground text-sm shrink-0">às</span>
                          <Input
                            type="time"
                            value={editData.close_time}
                            onChange={(e) => setEditData({ ...editData, close_time: e.target.value })}
                            className="w-full sm:w-28"
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-primary shrink-0"
                            onClick={() => handleSave(hour)}
                            disabled={updateHour.isPending}
                          >
                            {updateHour.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 shrink-0"
                            onClick={() => setEditingId(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between flex-1">
                          <p className={cn(
                            "text-sm",
                            hour.is_active ? "text-foreground" : "text-muted-foreground"
                          )}>
                            {hour.open_time.slice(0, 5)} às {hour.close_time.slice(0, 5)}
                          </p>
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => handleEdit(hour)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            {daySlots.length > 1 && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => handleDeleteSlot(hour.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add slot button */}
                <button
                  onClick={() => handleAddSlot(day)}
                  className="mt-2 flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors pl-2"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Adicionar horário
                </button>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground mt-4 text-center">
          Adicione múltiplos horários por dia (ex: almoço e jantar)
        </p>
      </div>
    </AdminLayout>
  );
};

export default AdminHours;
