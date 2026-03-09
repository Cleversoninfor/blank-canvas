import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Coupon {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_value: number;
  max_uses: number | null;
  current_uses: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

export function useCoupons() {
  return useQuery({
    queryKey: ['coupons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Coupon[];
    },
  });
}

export function useValidateCoupon() {
  return useMutation({
    mutationFn: async ({ code, orderTotal }: { code: string; orderTotal: number }) => {
      // Use the secure validate_coupon function
      const { data, error } = await supabase
        .rpc('validate_coupon', { coupon_code: code });
      
      if (error) throw error;
      if (!data || data.length === 0) throw new Error('Cupom não encontrado');
      
      const coupon = data[0];
      
      // Check if valid
      if (!coupon.is_valid) {
        throw new Error('Cupom inválido ou expirado');
      }
      
      // Check min order value
      if (coupon.min_order_value && orderTotal < coupon.min_order_value) {
        throw new Error(`Pedido mínimo de R$ ${Number(coupon.min_order_value).toFixed(2)} para usar este cupom`);
      }
      
      return {
        id: coupon.id,
        code: coupon.code,
        discount_type: coupon.discount_type as 'percentage' | 'fixed',
        discount_value: Number(coupon.discount_value),
        min_order_value: Number(coupon.min_order_value) || 0,
        max_uses: null,
        current_uses: 0,
        is_active: true,
        expires_at: null,
        created_at: '',
      } as Coupon;
    },
  });
}

export function useCreateCoupon() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (coupon: Omit<Coupon, 'id' | 'current_uses' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('coupons')
        .insert({
          ...coupon,
          code: coupon.code.toUpperCase(),
          current_uses: 0,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
    },
  });
}

export function useUpdateCoupon() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...update }: Partial<Coupon> & { id: string }) => {
      const { data, error } = await supabase
        .from('coupons')
        .update(update)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
    },
  });
}

export function useDeleteCoupon() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('coupons')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
    },
  });
}

export function calculateDiscount(coupon: Coupon, orderTotal: number): number {
  if (coupon.discount_type === 'percentage') {
    return (orderTotal * coupon.discount_value) / 100;
  }
  return coupon.discount_value;
}
