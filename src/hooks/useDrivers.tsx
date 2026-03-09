import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Driver {
  id: string;
  name: string;
  phone: string | null;
  is_active: boolean;
  commission_percentage: number;
  created_at: string;
  updated_at: string;
}

export function useDrivers() {
  return useQuery({
    queryKey: ['drivers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      return data as Driver[];
    },
  });
}

export function useActiveDrivers() {
  return useQuery({
    queryKey: ['drivers', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });
      if (error) throw error;
      return data as Driver[];
    },
  });
}

export function useCreateDriver() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; phone?: string; commission_percentage?: number }) => {
      const { data: driver, error } = await supabase
        .from('drivers')
        .insert({ name: data.name, phone: data.phone || null, is_active: true, commission_percentage: data.commission_percentage ?? 5 })
        .select()
        .single();
      if (error) throw error;
      return driver;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['drivers'] }),
  });
}

export function useUpdateDriver() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Driver> }) => {
      const { data: updated, error } = await supabase
        .from('drivers')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return updated;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['drivers'] }),
  });
}

export function useDeleteDriver() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('drivers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['drivers'] }),
  });
}

export function useAssignDriver() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, driverId, driverName }: { orderId: number; driverId: string; driverName: string }) => {
      const { data, error } = await supabase
        .from('orders')
        .update({ driver_id: driverId, driver_name: driverName })
        .eq('id', orderId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['driver-orders'] });
    },
  });
}

export function useDriverOrders(driverId: string | null) {
  return useQuery({
    queryKey: ['driver-orders', driverId],
    queryFn: async () => {
      if (!driverId) return [];
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('driver_id', driverId)
        .in('status', ['ready', 'delivery'])
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!driverId,
    refetchInterval: 5000,
  });
}

export function useDriverOrderItems(orderId: number) {
  return useQuery({
    queryKey: ['driver-order-items', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId);
      if (error) throw error;
      return data;
    },
    enabled: !!orderId,
  });
}
