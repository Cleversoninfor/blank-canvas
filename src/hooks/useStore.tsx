import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface StoreConfig {
  id: string;
  name: string;
  phone_whatsapp: string | null;
  pix_key: string | null;
  pix_key_type: string | null;
  pix_message: string | null;
  logo_url: string | null;
  cover_url: string | null;
  is_open: boolean;
  delivery_fee: number;
  delivery_fee_mode: 'fixed' | 'zones' | null;
  min_order_value: number;
  address: string | null;
  delivery_time_min: number | null;
  delivery_time_max: number | null;
  pickup_time_min: number | null;
  pickup_time_max: number | null;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  pwa_name: string | null;
  pwa_short_name: string | null;
  hero_text_1: string | null;
  hero_text_2: string | null;
  hero_text_3: string | null;
  hero_slogan: string | null;
  custom_domain: string | null;
  subdomain_slug: string | null;
  floating_image_url: string | null;
  floating_image_size: number | null;
  floating_image_position: number | null;
  floating_image_vertical_position: number | null;
  floating_image_size_mobile: number | null;
  floating_image_position_mobile: number | null;
  floating_image_vertical_position_mobile: number | null;
  mode_delivery_enabled: boolean | null;
  mode_pickup_enabled: boolean | null;
  mode_dine_in_enabled: boolean | null;
  menu_layout: string;
}

export function useStoreConfig() {
  return useQuery({
    queryKey: ['store-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_config')
        .select('*')
        .maybeSingle();
      
      if (error) throw error;
      
      // If no store config exists, return default values
      if (!data) {
        return {
          id: '',
          name: 'Meu Restaurante',
          phone_whatsapp: null,
          pix_key: null,
          pix_key_type: null,
          pix_message: null,
          logo_url: null,
          cover_url: null,
          is_open: true,
          delivery_fee: 5,
          delivery_fee_mode: 'fixed' as const,
          min_order_value: 20,
          address: null,
          delivery_time_min: 30,
          delivery_time_max: 45,
          pickup_time_min: 15,
          pickup_time_max: 25,
          primary_color: '25 95% 53%',
          secondary_color: '142 76% 36%',
          accent_color: '25 100% 95%',
          pwa_name: 'Cardápio',
          pwa_short_name: 'Cardápio',
          hero_text_1: 'Carne macia',
          hero_text_2: 'Suculenta',
          hero_text_3: 'Sabor Irresistível',
          hero_slogan: 'O segredo está no tempero',
          custom_domain: null,
          subdomain_slug: null,
          floating_image_url: null,
          floating_image_size: 100,
          floating_image_position: 50,
          floating_image_vertical_position: 50,
          floating_image_size_mobile: 100,
          floating_image_position_mobile: 50,
          floating_image_vertical_position_mobile: 70,
          mode_delivery_enabled: true,
          mode_pickup_enabled: true,
          mode_dine_in_enabled: true,
          menu_layout: 'list',
        } as StoreConfig;
      }
      
      return data as StoreConfig;
    },
  });
}

export function useUpdateStoreConfig() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...update }: Partial<StoreConfig> & { id?: string }) => {
      // If no id or empty id, we need to create the config first
      if (!id) {
        const { data, error } = await supabase
          .from('store_config')
          .insert(update)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
      
      const { data, error } = await supabase
        .from('store_config')
        .update(update)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-config'] });
    },
  });
}
