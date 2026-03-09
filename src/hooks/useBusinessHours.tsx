import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BusinessHour {
  id: string;
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_active: boolean;
}

export function useBusinessHours() {
  return useQuery({
    queryKey: ['business-hours'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_hours')
        .select('*')
        .order('day_of_week', { ascending: true })
        .order('open_time', { ascending: true });
      
      if (error) throw error;
      return data as BusinessHour[];
    },
  });
}

export function useUpdateBusinessHour() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...update }: Partial<BusinessHour> & { id: string }) => {
      const { data, error } = await supabase
        .from('business_hours')
        .update(update)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-hours'] });
    },
  });
}

export function useCreateBusinessHours() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const defaultHours = Array.from({ length: 7 }, (_, i) => ({
        day_of_week: i,
        open_time: '08:00',
        close_time: '22:00',
        is_active: true,
      }));
      
      const { data, error } = await supabase
        .from('business_hours')
        .insert(defaultHours)
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-hours'] });
    },
  });
}

export function useDeleteBusinessHour() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('business_hours')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-hours'] });
    },
  });
}

// Helper to get day name
export function getDayName(day: number): string {
  const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  return days[day] || '';
}

// Helper to get Brazil time (America/Sao_Paulo)
function getBrazilTime(): { day: number; time: string } {
  const now = new Date();
  
  const brazilFormatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  
  const dayFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    weekday: 'short',
  });
  
  const dayName = dayFormatter.format(now);
  const dayMap: Record<string, number> = {
    'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6
  };
  
  return {
    day: dayMap[dayName] ?? now.getDay(),
    time: brazilFormatter.format(now),
  };
}

// Helper to check if store is currently open (supports multiple slots per day)
export function isStoreCurrentlyOpen(hours: BusinessHour[]): boolean {
  const { day: currentDay, time: currentTime } = getBrazilTime();
  
  const todaySlots = hours.filter(h => h.day_of_week === currentDay && h.is_active);
  
  if (todaySlots.length === 0) return false;
  
  return todaySlots.some(slot => {
    const openTime = slot.open_time.slice(0, 5);
    const closeTime = slot.close_time.slice(0, 5);
    
    if (closeTime === '00:00') {
      return currentTime >= openTime;
    }
    
    if (closeTime < openTime) {
      return currentTime >= openTime || currentTime <= closeTime;
    }
    
    return currentTime >= openTime && currentTime <= closeTime;
  });
}

// Hook to check if store is open
export function useIsStoreOpen() {
  const { data: hours = [] } = useBusinessHours();
  return isStoreCurrentlyOpen(hours);
}
