export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      addon_groups: {
        Row: {
          created_at: string
          id: string
          is_required: boolean
          max_selections: number
          name: string
          sort_order: number
          subtitle: string | null
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_required?: boolean
          max_selections?: number
          name: string
          sort_order?: number
          subtitle?: string | null
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          is_required?: boolean
          max_selections?: number
          name?: string
          sort_order?: number
          subtitle?: string | null
          title?: string
        }
        Relationships: []
      }
      addon_options: {
        Row: {
          created_at: string
          group_id: string
          id: string
          is_available: boolean
          name: string
          price: number
          sort_order: number
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          is_available?: boolean
          name: string
          price?: number
          sort_order?: number
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          is_available?: boolean
          name?: string
          price?: number
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "addon_options_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "addon_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_users: {
        Row: {
          acesso_gestao: boolean
          acesso_operacoes: boolean
          acesso_sistema: boolean
          created_at: string
          id: string
          senha: string
          updated_at: string
          usuario: string
        }
        Insert: {
          acesso_gestao?: boolean
          acesso_operacoes?: boolean
          acesso_sistema?: boolean
          created_at?: string
          id?: string
          senha: string
          updated_at?: string
          usuario: string
        }
        Update: {
          acesso_gestao?: boolean
          acesso_operacoes?: boolean
          acesso_sistema?: boolean
          created_at?: string
          id?: string
          senha?: string
          updated_at?: string
          usuario?: string
        }
        Relationships: []
      }
      business_hours: {
        Row: {
          close_time: string
          created_at: string
          day_of_week: number
          id: string
          is_active: boolean
          open_time: string
        }
        Insert: {
          close_time: string
          created_at?: string
          day_of_week: number
          id?: string
          is_active?: boolean
          open_time: string
        }
        Update: {
          close_time?: string
          created_at?: string
          day_of_week?: number
          id?: string
          is_active?: boolean
          open_time?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      comanda_pedidos: {
        Row: {
          comanda_id: string
          created_at: string
          id: string
          pedido_id: number
        }
        Insert: {
          comanda_id: string
          created_at?: string
          id?: string
          pedido_id: number
        }
        Update: {
          comanda_id?: string
          created_at?: string
          id?: string
          pedido_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "comanda_pedidos_comanda_id_fkey"
            columns: ["comanda_id"]
            isOneToOne: false
            referencedRelation: "comandas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comanda_pedidos_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      comanda_vendas: {
        Row: {
          comanda_id: string | null
          created_at: string
          data_venda: string
          forma_pagamento: string
          id: string
          valor_total: number
        }
        Insert: {
          comanda_id?: string | null
          created_at?: string
          data_venda?: string
          forma_pagamento: string
          id?: string
          valor_total?: number
        }
        Update: {
          comanda_id?: string | null
          created_at?: string
          data_venda?: string
          forma_pagamento?: string
          id?: string
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "comanda_vendas_comanda_id_fkey"
            columns: ["comanda_id"]
            isOneToOne: false
            referencedRelation: "comandas"
            referencedColumns: ["id"]
          },
        ]
      }
      comandas: {
        Row: {
          created_at: string
          id: string
          numero_comanda: number
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          numero_comanda: number
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          numero_comanda?: number
          status?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          current_uses: number
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          min_order_value: number | null
        }
        Insert: {
          code: string
          created_at?: string
          current_uses?: number
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_order_value?: number | null
        }
        Update: {
          code?: string
          created_at?: string
          current_uses?: number
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_order_value?: number | null
        }
        Relationships: []
      }
      customer_addresses: {
        Row: {
          complement: string | null
          created_at: string
          customer_phone: string
          id: string
          is_default: boolean
          label: string
          neighborhood: string
          number: string
          reference: string | null
          street: string
          updated_at: string
        }
        Insert: {
          complement?: string | null
          created_at?: string
          customer_phone: string
          id?: string
          is_default?: boolean
          label?: string
          neighborhood: string
          number: string
          reference?: string | null
          street: string
          updated_at?: string
        }
        Update: {
          complement?: string | null
          created_at?: string
          customer_phone?: string
          id?: string
          is_default?: boolean
          label?: string
          neighborhood?: string
          number?: string
          reference?: string | null
          street?: string
          updated_at?: string
        }
        Relationships: []
      }
      delivery_zones: {
        Row: {
          created_at: string
          fee: number
          id: string
          is_active: boolean
          min_order_value: number | null
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          fee?: number
          id?: string
          is_active?: boolean
          min_order_value?: number | null
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          fee?: number
          id?: string
          is_active?: boolean
          min_order_value?: number | null
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      drivers: {
        Row: {
          commission_percentage: number
          created_at: string
          id: string
          is_active: boolean
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          commission_percentage?: number
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          commission_percentage?: number
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          observation: string | null
          order_id: number | null
          product_name: string
          quantity: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          observation?: string | null
          order_id?: number | null
          product_name: string
          quantity?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          id?: string
          observation?: string | null
          order_id?: number | null
          product_name?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address_complement: string | null
          address_neighborhood: string
          address_number: string
          address_reference: string | null
          address_street: string
          change_for: number | null
          created_at: string
          customer_name: string
          customer_phone: string
          driver_id: string | null
          driver_name: string | null
          id: number
          latitude: number | null
          longitude: number | null
          payment_method: string
          status: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          address_complement?: string | null
          address_neighborhood: string
          address_number: string
          address_reference?: string | null
          address_street: string
          change_for?: number | null
          created_at?: string
          customer_name: string
          customer_phone: string
          driver_id?: string | null
          driver_name?: string | null
          id?: number
          latitude?: number | null
          longitude?: number | null
          payment_method: string
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          address_complement?: string | null
          address_neighborhood?: string
          address_number?: string
          address_reference?: string | null
          address_street?: string
          change_for?: number | null
          created_at?: string
          customer_name?: string
          customer_phone?: string
          driver_id?: string | null
          driver_name?: string | null
          id?: number
          latitude?: number | null
          longitude?: number | null
          payment_method?: string
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      product_addon_groups: {
        Row: {
          addon_group_id: string
          created_at: string
          id: string
          product_id: string
        }
        Insert: {
          addon_group_id: string
          created_at?: string
          id?: string
          product_id: string
        }
        Update: {
          addon_group_id?: string
          created_at?: string
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_addon_groups_addon_group_id_fkey"
            columns: ["addon_group_id"]
            isOneToOne: false
            referencedRelation: "addon_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_addon_groups_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_available: boolean
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          name: string
          price?: number
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_identifier: string | null
          user_type: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_identifier?: string | null
          user_type?: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_identifier?: string | null
          user_type?: string
        }
        Relationships: []
      }
      store_config: {
        Row: {
          accent_color: string | null
          address: string | null
          cover_url: string | null
          cover_url_mobile: string | null
          created_at: string
          custom_domain: string | null
          delivery_fee: number
          delivery_fee_mode: string | null
          delivery_time_max: number | null
          delivery_time_min: number | null
          floating_image_enabled: boolean | null
          floating_image_position: number | null
          floating_image_position_mobile: number | null
          floating_image_size: number | null
          floating_image_size_mobile: number | null
          floating_image_url: string | null
          floating_image_vertical_position: number | null
          floating_image_vertical_position_mobile: number | null
          hero_banner_enabled: boolean | null
          hero_slogan: string | null
          hero_text_1: string | null
          hero_text_2: string | null
          hero_text_3: string | null
          id: string
          is_open: boolean
          logo_url: string | null
          menu_layout: string
          min_order_value: number
          mode_delivery_enabled: boolean | null
          mode_dine_in_enabled: boolean | null
          mode_pickup_enabled: boolean | null
          name: string
          pdv_password: string | null
          phone_whatsapp: string | null
          pickup_time_max: number | null
          pickup_time_min: number | null
          pix_key: string | null
          pix_key_type: string | null
          pix_message: string | null
          primary_color: string | null
          pwa_name: string | null
          pwa_short_name: string | null
          secondary_color: string | null
          subdomain_slug: string | null
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          address?: string | null
          cover_url?: string | null
          cover_url_mobile?: string | null
          created_at?: string
          custom_domain?: string | null
          delivery_fee?: number
          delivery_fee_mode?: string | null
          delivery_time_max?: number | null
          delivery_time_min?: number | null
          floating_image_enabled?: boolean | null
          floating_image_position?: number | null
          floating_image_position_mobile?: number | null
          floating_image_size?: number | null
          floating_image_size_mobile?: number | null
          floating_image_url?: string | null
          floating_image_vertical_position?: number | null
          floating_image_vertical_position_mobile?: number | null
          hero_banner_enabled?: boolean | null
          hero_slogan?: string | null
          hero_text_1?: string | null
          hero_text_2?: string | null
          hero_text_3?: string | null
          id?: string
          is_open?: boolean
          logo_url?: string | null
          menu_layout?: string
          min_order_value?: number
          mode_delivery_enabled?: boolean | null
          mode_dine_in_enabled?: boolean | null
          mode_pickup_enabled?: boolean | null
          name?: string
          pdv_password?: string | null
          phone_whatsapp?: string | null
          pickup_time_max?: number | null
          pickup_time_min?: number | null
          pix_key?: string | null
          pix_key_type?: string | null
          pix_message?: string | null
          primary_color?: string | null
          pwa_name?: string | null
          pwa_short_name?: string | null
          secondary_color?: string | null
          subdomain_slug?: string | null
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          address?: string | null
          cover_url?: string | null
          cover_url_mobile?: string | null
          created_at?: string
          custom_domain?: string | null
          delivery_fee?: number
          delivery_fee_mode?: string | null
          delivery_time_max?: number | null
          delivery_time_min?: number | null
          floating_image_enabled?: boolean | null
          floating_image_position?: number | null
          floating_image_position_mobile?: number | null
          floating_image_size?: number | null
          floating_image_size_mobile?: number | null
          floating_image_url?: string | null
          floating_image_vertical_position?: number | null
          floating_image_vertical_position_mobile?: number | null
          hero_banner_enabled?: boolean | null
          hero_slogan?: string | null
          hero_text_1?: string | null
          hero_text_2?: string | null
          hero_text_3?: string | null
          id?: string
          is_open?: boolean
          logo_url?: string | null
          menu_layout?: string
          min_order_value?: number
          mode_delivery_enabled?: boolean | null
          mode_dine_in_enabled?: boolean | null
          mode_pickup_enabled?: boolean | null
          name?: string
          pdv_password?: string | null
          phone_whatsapp?: string | null
          pickup_time_max?: number | null
          pickup_time_min?: number | null
          pix_key?: string | null
          pix_key_type?: string | null
          pix_message?: string | null
          primary_color?: string | null
          pwa_name?: string | null
          pwa_short_name?: string | null
          secondary_color?: string | null
          subdomain_slug?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      table_order_items: {
        Row: {
          created_at: string | null
          delivered_at: string | null
          id: string
          observation: string | null
          ordered_at: string | null
          product_id: string | null
          product_name: string
          quantity: number
          status: string | null
          table_order_id: number | null
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          delivered_at?: string | null
          id?: string
          observation?: string | null
          ordered_at?: string | null
          product_id?: string | null
          product_name: string
          quantity?: number
          status?: string | null
          table_order_id?: number | null
          unit_price: number
        }
        Update: {
          created_at?: string | null
          delivered_at?: string | null
          id?: string
          observation?: string | null
          ordered_at?: string | null
          product_id?: string | null
          product_name?: string
          quantity?: number
          status?: string | null
          table_order_id?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "table_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "table_order_items_table_order_id_fkey"
            columns: ["table_order_id"]
            isOneToOne: false
            referencedRelation: "table_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      table_orders: {
        Row: {
          closed_at: string | null
          created_at: string | null
          customer_count: number | null
          customer_names: string[] | null
          discount: number | null
          discount_type: string | null
          id: number
          notes: string | null
          opened_at: string | null
          payment_method: string | null
          service_fee_enabled: boolean | null
          service_fee_percentage: number | null
          status: string | null
          subtotal: number | null
          table_id: string | null
          total_amount: number | null
          updated_at: string | null
          waiter_id: string | null
          waiter_name: string | null
        }
        Insert: {
          closed_at?: string | null
          created_at?: string | null
          customer_count?: number | null
          customer_names?: string[] | null
          discount?: number | null
          discount_type?: string | null
          id?: never
          notes?: string | null
          opened_at?: string | null
          payment_method?: string | null
          service_fee_enabled?: boolean | null
          service_fee_percentage?: number | null
          status?: string | null
          subtotal?: number | null
          table_id?: string | null
          total_amount?: number | null
          updated_at?: string | null
          waiter_id?: string | null
          waiter_name?: string | null
        }
        Update: {
          closed_at?: string | null
          created_at?: string | null
          customer_count?: number | null
          customer_names?: string[] | null
          discount?: number | null
          discount_type?: string | null
          id?: never
          notes?: string | null
          opened_at?: string | null
          payment_method?: string | null
          service_fee_enabled?: boolean | null
          service_fee_percentage?: number | null
          status?: string | null
          subtotal?: number | null
          table_id?: string | null
          total_amount?: number | null
          updated_at?: string | null
          waiter_id?: string | null
          waiter_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "table_orders_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "table_orders_waiter_id_fkey"
            columns: ["waiter_id"]
            isOneToOne: false
            referencedRelation: "waiters"
            referencedColumns: ["id"]
          },
        ]
      }
      tables: {
        Row: {
          capacity: number | null
          created_at: string | null
          current_order_id: number | null
          id: string
          name: string | null
          number: number
          status: string | null
          updated_at: string | null
        }
        Insert: {
          capacity?: number | null
          created_at?: string | null
          current_order_id?: number | null
          id?: string
          name?: string | null
          number: number
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          capacity?: number | null
          created_at?: string | null
          current_order_id?: number | null
          id?: string
          name?: string | null
          number?: number
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tables_current_order_id_fkey"
            columns: ["current_order_id"]
            isOneToOne: false
            referencedRelation: "table_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vapid_keys: {
        Row: {
          created_at: string
          id: string
          private_key: string
          public_key: string
        }
        Insert: {
          created_at?: string
          id?: string
          private_key: string
          public_key: string
        }
        Update: {
          created_at?: string
          id?: string
          private_key?: string
          public_key?: string
        }
        Relationships: []
      }
      waiters: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_order_with_items: {
        Args: {
          _address_complement?: string
          _address_neighborhood: string
          _address_number: string
          _address_reference?: string
          _address_street: string
          _change_for?: number
          _customer_name: string
          _customer_phone: string
          _items: Json
          _latitude?: number
          _longitude?: number
          _payment_method: string
          _total_amount: number
        }
        Returns: number
      }
      driver_update_order_status: {
        Args: { _driver_id: string; _new_status: string; _order_id: number }
        Returns: boolean
      }
      get_kitchen_items: {
        Args: { _status_filter?: string }
        Returns: {
          customer_name: string
          delivered_at: string
          id: string
          observation: string
          order_id: number
          order_type: string
          ordered_at: string
          product_id: string
          product_name: string
          quantity: number
          status: string
          table_name: string
          table_number: number
          table_order_id: number
          unit_price: number
          waiter_name: string
        }[]
      }
      get_order_with_items_public: {
        Args: { _customer_phone: string; _order_id: number }
        Returns: Json
      }
      get_public_store_config: {
        Args: never
        Returns: {
          accent_color: string
          address: string
          cover_url: string
          delivery_fee: number
          delivery_fee_mode: string
          delivery_time_max: number
          delivery_time_min: number
          floating_image_position: number
          floating_image_position_mobile: number
          floating_image_size: number
          floating_image_size_mobile: number
          floating_image_url: string
          floating_image_vertical_position: number
          floating_image_vertical_position_mobile: number
          hero_slogan: string
          hero_text_1: string
          hero_text_2: string
          hero_text_3: string
          id: string
          is_open: boolean
          logo_url: string
          min_order_value: number
          name: string
          primary_color: string
          pwa_name: string
          pwa_short_name: string
          secondary_color: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      validate_coupon: {
        Args: { coupon_code: string }
        Returns: {
          code: string
          discount_type: string
          discount_value: number
          id: string
          is_valid: boolean
          min_order_value: number
        }[]
      }
      verify_admin_login: {
        Args: { _senha: string; _usuario: string }
        Returns: {
          acesso_gestao: boolean
          acesso_operacoes: boolean
          acesso_sistema: boolean
          id: string
          usuario: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
