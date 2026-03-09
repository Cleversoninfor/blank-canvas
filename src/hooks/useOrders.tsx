import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Order {
  id: number;
  customer_name: string;
  customer_phone: string;
  address_street: string;
  address_number: string;
  address_neighborhood: string;
  address_complement: string | null;
  address_reference: string | null;
  total_amount: number;
  status: 'pending' | 'preparing' | 'ready' | 'delivery' | 'completed' | 'cancelled';
  payment_method: 'money' | 'card' | 'pix' | 'credit' | 'debit';
  change_for: number | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  observation: string | null;
}

export interface CreateOrderData {
  customer_name: string;
  customer_phone: string;
  address_street: string;
  address_number: string;
  address_neighborhood: string;
  address_complement?: string | null;
  address_reference?: string | null;
  total_amount: number;
  payment_method: 'money' | 'card' | 'pix' | 'credit' | 'debit';
  change_for?: number | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface CreateOrderItemData {
  order_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  observation?: string | null;
}

export function useOrders() {
  return useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Order[];
    },
  });
}

export function useOrderItems(orderId: number) {
  return useQuery({
    queryKey: ['order-items', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId);
      
      if (error) throw error;
      return data as OrderItem[];
    },
    enabled: !!orderId,
  });
}

const CUSTOMER_PHONE_KEY = 'delivery-customer-phone';

export function saveCustomerPhone(phone: string) {
  try {
    localStorage.setItem(CUSTOMER_PHONE_KEY, phone);
  } catch (e) {
    console.error('Error saving customer phone:', e);
  }
}

export function getCustomerPhone(): string | null {
  try {
    return localStorage.getItem(CUSTOMER_PHONE_KEY);
  } catch (e) {
    return null;
  }
}

export function useOrderWithItems(orderId: number) {
  const customerPhone = getCustomerPhone();

  const orderQuery = useQuery({
    queryKey: ['order', orderId, customerPhone],
    queryFn: async () => {
      // Prefer public RPC when we have the customer's phone (public flow)
      if (customerPhone) {
        const { data, error } = await supabase.rpc('get_order_with_items_public', {
          _order_id: orderId,
          _customer_phone: customerPhone,
        });

        if (error) throw error;
        if (!data) return { order: null, items: [] };

        const result = data as unknown as { order: Order; items: OrderItem[] };
        return {
          order: result.order,
          items: result.items,
        };
      }

      // Admin fallback (direct read)
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .maybeSingle();

      if (error) throw error;

      const { data: itemsData, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId);

      if (itemsError) throw itemsError;

      return {
        order: data as Order | null,
        items: (itemsData as OrderItem[]) || [],
      };
    },
    enabled: !!orderId,
    // Realtime can be blocked for public users by security rules; polling guarantees updates.
    refetchInterval: (query) => {
      const status = (query.state.data as any)?.order?.status as Order['status'] | undefined;
      if (!customerPhone) return false;
      if (!status) return 5000;
      return status === 'completed' || status === 'cancelled' ? false : 5000;
    },
    refetchIntervalInBackground: true,
  });

  return {
    order: orderQuery.data?.order,
    items: orderQuery.data?.items,
    isLoading: orderQuery.isLoading,
    error: orderQuery.error,
  };
}


export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ order, items }: { order: CreateOrderData; items: Omit<CreateOrderItemData, 'order_id'>[] }) => {
      // Use RPC function that bypasses RLS (security definer)
      const { data: orderId, error } = await supabase.rpc('create_order_with_items', {
        _customer_name: order.customer_name,
        _customer_phone: order.customer_phone,
        _address_street: order.address_street,
        _address_number: order.address_number,
        _address_neighborhood: order.address_neighborhood,
        _total_amount: order.total_amount,
        _payment_method: order.payment_method,
        _items: items.map(item => ({
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          observation: item.observation || null,
        })),
        _address_complement: order.address_complement || null,
        _address_reference: order.address_reference || null,
        _change_for: order.change_for ?? null,
        _latitude: order.latitude ?? null,
        _longitude: order.longitude ?? null,
      });

      if (error) {
        console.error('create_order_with_items error:', error);
        throw error;
      }

      // Return a minimal order object with the ID
      return { id: orderId } as Order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, status }: { orderId: number; status: Order['status'] }) => {
      const { data, error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId)
        .select()
        .single();
      
      if (error) throw error;
      return data as Order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
