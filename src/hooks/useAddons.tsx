import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AddonGroup {
  id: string;
  name: string;
  title: string;
  subtitle: string | null;
  is_required: boolean;
  max_selections: number;
  sort_order: number;
}

export interface AddonOption {
  id: string;
  group_id: string;
  name: string;
  price: number;
  is_available: boolean;
  sort_order: number;
}

export interface ProductAddonGroup {
  id: string;
  product_id: string;
  addon_group_id: string;
}

// ============================================
// ADDON GROUPS
// ============================================

export function useAddonGroups() {
  return useQuery({
    queryKey: ['addon-groups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('addon_groups')
        .select('*')
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      return data as AddonGroup[];
    },
  });
}

export function useCreateAddonGroup() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (group: Omit<AddonGroup, 'id'>) => {
      const { data, error } = await supabase
        .from('addon_groups')
        .insert(group)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addon-groups'] });
    },
  });
}

export function useUpdateAddonGroup() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...update }: Partial<AddonGroup> & { id: string }) => {
      const { data, error } = await supabase
        .from('addon_groups')
        .update(update)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addon-groups'] });
    },
  });
}

export function useDeleteAddonGroup() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      // Delete options first
      const { error: optionsError } = await supabase
        .from('addon_options')
        .delete()
        .eq('group_id', id);
      
      if (optionsError) throw optionsError;
      
      const { error } = await supabase
        .from('addon_groups')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addon-groups'] });
      queryClient.invalidateQueries({ queryKey: ['addon-options'] });
    },
  });
}

// ============================================
// ADDON OPTIONS
// ============================================

export function useAddonOptions(groupId?: string) {
  return useQuery({
    queryKey: ['addon-options', groupId],
    queryFn: async () => {
      let query = supabase
        .from('addon_options')
        .select('*')
        .order('sort_order', { ascending: true });
      
      if (groupId) {
        query = query.eq('group_id', groupId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as AddonOption[];
    },
  });
}

export function useCreateAddonOption() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (option: Omit<AddonOption, 'id'>) => {
      const { data, error } = await supabase
        .from('addon_options')
        .insert(option)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addon-options'] });
    },
  });
}

export function useUpdateAddonOption() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...update }: Partial<AddonOption> & { id: string }) => {
      const { data, error } = await supabase
        .from('addon_options')
        .update(update)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addon-options'] });
    },
  });
}

export function useDeleteAddonOption() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('addon_options')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addon-options'] });
    },
  });
}

// ============================================
// PRODUCT ADDON GROUPS (relação produto <-> grupo)
// ============================================

export function useProductAddonGroups(productId?: string) {
  return useQuery({
    queryKey: ['product-addon-groups', productId],
    queryFn: async () => {
      if (!productId) return [];
      
      const { data, error } = await supabase
        .from('product_addon_groups')
        .select('*, addon_group:addon_groups(*)')
        .eq('product_id', productId);
      
      if (error) throw error;
      return data as (ProductAddonGroup & { addon_group: AddonGroup })[];
    },
    enabled: !!productId,
  });
}

export function useAddProductAddonGroup() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ product_id, addon_group_id }: { product_id: string; addon_group_id: string }) => {
      const { data, error } = await supabase
        .from('product_addon_groups')
        .insert({ product_id, addon_group_id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-addon-groups'] });
    },
  });
}

export function useRemoveProductAddonGroup() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ product_id, addon_group_id }: { product_id: string; addon_group_id: string }) => {
      const { error } = await supabase
        .from('product_addon_groups')
        .delete()
        .eq('product_id', product_id)
        .eq('addon_group_id', addon_group_id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-addon-groups'] });
    },
  });
}

// Hook para buscar todos os acréscimos de um produto (grupos + opções)
export function useProductAddons(productId: string) {
  return useQuery({
    queryKey: ['product-addons', productId],
    queryFn: async () => {
      // Get product addon groups
      const { data: productGroups, error: productGroupsError } = await supabase
        .from('product_addon_groups')
        .select('addon_group_id')
        .eq('product_id', productId);
      
      if (productGroupsError) throw productGroupsError;
      
      if (!productGroups || productGroups.length === 0) return [];
      
      const groupIds = productGroups.map(pg => pg.addon_group_id);
      
      // Get addon groups
      const { data: groups, error: groupsError } = await supabase
        .from('addon_groups')
        .select('*')
        .in('id', groupIds)
        .order('sort_order', { ascending: true });
      
      if (groupsError) throw groupsError;
      
      // Get options for these groups
      const { data: options, error: optionsError } = await supabase
        .from('addon_options')
        .select('*')
        .in('group_id', groupIds)
        .eq('is_available', true)
        .order('sort_order', { ascending: true });
      
      if (optionsError) throw optionsError;
      
      // Combine groups with their options
      return groups.map(group => ({
        ...group,
        options: options.filter(opt => opt.group_id === group.id),
      }));
    },
    enabled: !!productId,
  });
}
