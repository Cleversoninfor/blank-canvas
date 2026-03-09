import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface DeliveryZone {
  id: string;
  name: string;
  fee: number;
  min_order_value: number | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export function useDeliveryZones() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: zones = [], isLoading, refetch } = useQuery({
    queryKey: ['delivery-zones'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('delivery_zones')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as DeliveryZone[];
    },
  });

  const createZone = useMutation({
    mutationFn: async (zone: Omit<DeliveryZone, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('delivery_zones')
        .insert(zone)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-zones'] });
      toast({ title: 'Zona de entrega criada com sucesso!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao criar zona', description: error.message, variant: 'destructive' });
    },
  });

  const updateZone = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DeliveryZone> & { id: string }) => {
      const { data, error } = await supabase
        .from('delivery_zones')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-zones'] });
      toast({ title: 'Zona atualizada com sucesso!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao atualizar zona', description: error.message, variant: 'destructive' });
    },
  });

  const deleteZone = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('delivery_zones')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-zones'] });
      toast({ title: 'Zona removida com sucesso!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao remover zona', description: error.message, variant: 'destructive' });
    },
  });

  return {
    zones,
    isLoading,
    refetch,
    createZone,
    updateZone,
    deleteZone,
  };
}
