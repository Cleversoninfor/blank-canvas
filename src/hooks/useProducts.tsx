import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Product {
  id: string;
  category_id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  is_available: boolean;
  stock_type: 'unit' | 'ingredient';
  unit: string;
  stock_quantity: number;
  min_stock: number;
}

export interface ProductIngredient {
  id: string;
  product_id: string;
  ingredient_id: string;
  quantity_used: number;
  unit: string;
  ingredient?: {
    name: string;
    unit: string;
  };
}

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data.map(p => ({
        ...p,
        description: p.description || '',
        image_url: p.image_url || '',
        stock_type: p.stock_type || 'unit',
        unit: p.unit || 'un',
        stock_quantity: p.stock_quantity || 0,
        min_stock: p.min_stock || 0,
      })) as Product[];
    },
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (product: Omit<Product, 'id'>) => {
      const { data, error } = await supabase
        .from('products')
        .insert({
          name: product.name,
          description: product.description,
          price: product.price,
          category_id: product.category_id,
          image_url: product.image_url,
          is_available: product.is_available,
          stock_type: product.stock_type || 'unit',
          unit: product.unit || 'un',
          stock_quantity: product.stock_quantity || 0,
          min_stock: product.min_stock || 0,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...update }: Partial<Product> & { id: string }) => {
      const { data, error } = await supabase
        .from('products')
        .update(update)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useProductIngredients(productId?: string) {
  return useQuery({
    queryKey: ['product-ingredients', productId],
    queryFn: async () => {
      if (!productId) return [];
      const { data, error } = await supabase
        .from('product_ingredients')
        .select('*, ingredient:ingredients(name, unit)')
        .eq('product_id', productId);
      
      if (error) throw error;
      return data as ProductIngredient[];
    },
    enabled: !!productId,
  });
}

export function useUpdateProductIngredients() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ productId, ingredients }: { productId: string, ingredients: Omit<ProductIngredient, 'id' | 'product_id'>[] }) => {
      // First delete all existing ingredients for this product
      const { error: deleteError } = await supabase
        .from('product_ingredients')
        .delete()
        .eq('product_id', productId);
      
      if (deleteError) throw deleteError;

      if (ingredients.length === 0) return [];

      // Then insert new ones
      const { data, error: insertError } = await supabase
        .from('product_ingredients')
        .insert(
          ingredients.map(ing => ({
            product_id: productId,
            ingredient_id: ing.ingredient_id,
            quantity_used: ing.quantity_used,
            unit: ing.unit,
          }))
        )
        .select();
      
      if (insertError) throw insertError;
      return data;
    },
    onSuccess: (_, { productId }) => {
      queryClient.invalidateQueries({ queryKey: ['product-ingredients', productId] });
    },
  });
}
