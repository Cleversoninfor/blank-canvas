CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'user'
);


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: addon_groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.addon_groups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    title text NOT NULL,
    subtitle text,
    is_required boolean DEFAULT false NOT NULL,
    max_selections integer DEFAULT 1 NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: addon_options; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.addon_options (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    group_id uuid NOT NULL,
    name text NOT NULL,
    price numeric DEFAULT 0 NOT NULL,
    is_available boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: business_hours; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.business_hours (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    day_of_week integer NOT NULL,
    open_time time without time zone NOT NULL,
    close_time time without time zone NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT business_hours_day_of_week_check CHECK (((day_of_week >= 0) AND (day_of_week <= 6)))
);


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    image_url text
);


--
-- Name: coupons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.coupons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    discount_type text DEFAULT 'percentage'::text NOT NULL,
    discount_value numeric DEFAULT 0 NOT NULL,
    min_order_value numeric DEFAULT 0,
    max_uses integer,
    current_uses integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: customer_addresses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_addresses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_phone text NOT NULL,
    label text DEFAULT 'Casa'::text NOT NULL,
    street text NOT NULL,
    number text NOT NULL,
    neighborhood text NOT NULL,
    complement text,
    reference text,
    is_default boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: delivery_zones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.delivery_zones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    fee numeric DEFAULT 0 NOT NULL,
    min_order_value numeric,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id bigint,
    product_name text NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    unit_price numeric DEFAULT 0 NOT NULL,
    observation text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: orders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.orders_id_seq
    START WITH 1001
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id bigint DEFAULT nextval('public.orders_id_seq'::regclass) NOT NULL,
    customer_name text NOT NULL,
    customer_phone text NOT NULL,
    address_street text NOT NULL,
    address_number text NOT NULL,
    address_neighborhood text NOT NULL,
    total_amount numeric DEFAULT 0 NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    payment_method text NOT NULL,
    change_for numeric,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    address_complement text,
    address_reference text,
    CONSTRAINT orders_payment_method_check CHECK ((payment_method = ANY (ARRAY['money'::text, 'card'::text, 'pix'::text]))),
    CONSTRAINT orders_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'preparing'::text, 'delivery'::text, 'completed'::text, 'cancelled'::text])))
);


--
-- Name: product_addon_groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_addon_groups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    addon_group_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category_id uuid,
    name text NOT NULL,
    description text,
    price numeric DEFAULT 0 NOT NULL,
    image_url text,
    is_available boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: store_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.store_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text DEFAULT 'Meu Restaurante'::text NOT NULL,
    phone_whatsapp text,
    pix_key text,
    pix_key_type text DEFAULT 'Telefone'::text,
    logo_url text,
    is_open boolean DEFAULT true NOT NULL,
    delivery_fee numeric DEFAULT 5.00 NOT NULL,
    min_order_value numeric DEFAULT 20.00 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    cover_url text,
    address text,
    delivery_time_min integer DEFAULT 30,
    delivery_time_max integer DEFAULT 45,
    primary_color text DEFAULT '45 100% 51%'::text,
    secondary_color text DEFAULT '142 76% 49%'::text,
    accent_color text DEFAULT '45 100% 95%'::text,
    pwa_name text DEFAULT 'Cardápio'::text,
    pwa_short_name text DEFAULT 'Cardápio'::text,
    pix_message text DEFAULT 'Olá {nome}! 🍔

Pedido #{pedido} recebido!

Total: {total}

💠 Chave Pix: {chave_pix} ({tipo_chave})

Aguardamos o comprovante para iniciar o preparo!'::text,
    delivery_fee_mode text DEFAULT 'fixed'::text
);


--
-- Name: table_order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.table_order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    table_order_id bigint,
    product_id uuid,
    product_name text NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    unit_price numeric NOT NULL,
    observation text,
    status text DEFAULT 'pending'::text,
    ordered_at timestamp with time zone DEFAULT now(),
    delivered_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT table_order_items_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'preparing'::text, 'ready'::text, 'delivered'::text, 'cancelled'::text])))
);


--
-- Name: table_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.table_orders (
    id bigint NOT NULL,
    table_id uuid,
    waiter_name text,
    customer_count integer DEFAULT 1,
    status text DEFAULT 'open'::text,
    subtotal numeric DEFAULT 0,
    discount numeric DEFAULT 0,
    discount_type text DEFAULT 'value'::text,
    service_fee_enabled boolean DEFAULT true,
    service_fee_percentage numeric DEFAULT 10,
    total_amount numeric DEFAULT 0,
    payment_method text,
    opened_at timestamp with time zone DEFAULT now(),
    closed_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    waiter_id uuid,
    CONSTRAINT table_orders_discount_type_check CHECK ((discount_type = ANY (ARRAY['value'::text, 'percentage'::text]))),
    CONSTRAINT table_orders_status_check CHECK ((status = ANY (ARRAY['open'::text, 'requesting_bill'::text, 'paid'::text, 'cancelled'::text])))
);


--
-- Name: table_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.table_orders ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.table_orders_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: tables; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tables (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    number integer NOT NULL,
    name text,
    capacity integer DEFAULT 4,
    status text DEFAULT 'available'::text,
    current_order_id bigint,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT tables_status_check CHECK ((status = ANY (ARRAY['available'::text, 'occupied'::text, 'reserved'::text, 'requesting_bill'::text])))
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: waiters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.waiters (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    phone text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: addon_groups addon_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.addon_groups
    ADD CONSTRAINT addon_groups_pkey PRIMARY KEY (id);


--
-- Name: addon_options addon_options_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.addon_options
    ADD CONSTRAINT addon_options_pkey PRIMARY KEY (id);


--
-- Name: business_hours business_hours_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_hours
    ADD CONSTRAINT business_hours_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: coupons coupons_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupons
    ADD CONSTRAINT coupons_code_key UNIQUE (code);


--
-- Name: coupons coupons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupons
    ADD CONSTRAINT coupons_pkey PRIMARY KEY (id);


--
-- Name: customer_addresses customer_addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_addresses
    ADD CONSTRAINT customer_addresses_pkey PRIMARY KEY (id);


--
-- Name: delivery_zones delivery_zones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_zones
    ADD CONSTRAINT delivery_zones_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: product_addon_groups product_addon_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_addon_groups
    ADD CONSTRAINT product_addon_groups_pkey PRIMARY KEY (id);


--
-- Name: product_addon_groups product_addon_groups_product_id_addon_group_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_addon_groups
    ADD CONSTRAINT product_addon_groups_product_id_addon_group_id_key UNIQUE (product_id, addon_group_id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: store_config store_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_config
    ADD CONSTRAINT store_config_pkey PRIMARY KEY (id);


--
-- Name: table_order_items table_order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.table_order_items
    ADD CONSTRAINT table_order_items_pkey PRIMARY KEY (id);


--
-- Name: table_orders table_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.table_orders
    ADD CONSTRAINT table_orders_pkey PRIMARY KEY (id);


--
-- Name: tables tables_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tables
    ADD CONSTRAINT tables_number_key UNIQUE (number);


--
-- Name: tables tables_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tables
    ADD CONSTRAINT tables_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: waiters waiters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.waiters
    ADD CONSTRAINT waiters_pkey PRIMARY KEY (id);


--
-- Name: idx_customer_addresses_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_addresses_phone ON public.customer_addresses USING btree (customer_phone);


--
-- Name: customer_addresses update_customer_addresses_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_customer_addresses_updated_at BEFORE UPDATE ON public.customer_addresses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: delivery_zones update_delivery_zones_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_delivery_zones_updated_at BEFORE UPDATE ON public.delivery_zones FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: orders update_orders_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: products update_products_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: store_config update_store_config_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_store_config_updated_at BEFORE UPDATE ON public.store_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: table_orders update_table_orders_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_table_orders_updated_at BEFORE UPDATE ON public.table_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tables update_tables_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_tables_updated_at BEFORE UPDATE ON public.tables FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: waiters update_waiters_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_waiters_updated_at BEFORE UPDATE ON public.waiters FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: addon_options addon_options_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.addon_options
    ADD CONSTRAINT addon_options_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.addon_groups(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: product_addon_groups product_addon_groups_addon_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_addon_groups
    ADD CONSTRAINT product_addon_groups_addon_group_id_fkey FOREIGN KEY (addon_group_id) REFERENCES public.addon_groups(id) ON DELETE CASCADE;


--
-- Name: product_addon_groups product_addon_groups_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_addon_groups
    ADD CONSTRAINT product_addon_groups_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: products products_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;


--
-- Name: table_order_items table_order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.table_order_items
    ADD CONSTRAINT table_order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- Name: table_order_items table_order_items_table_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.table_order_items
    ADD CONSTRAINT table_order_items_table_order_id_fkey FOREIGN KEY (table_order_id) REFERENCES public.table_orders(id) ON DELETE CASCADE;


--
-- Name: table_orders table_orders_table_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.table_orders
    ADD CONSTRAINT table_orders_table_id_fkey FOREIGN KEY (table_id) REFERENCES public.tables(id) ON DELETE SET NULL;


--
-- Name: table_orders table_orders_waiter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.table_orders
    ADD CONSTRAINT table_orders_waiter_id_fkey FOREIGN KEY (waiter_id) REFERENCES public.waiters(id);


--
-- Name: tables tables_current_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tables
    ADD CONSTRAINT tables_current_order_id_fkey FOREIGN KEY (current_order_id) REFERENCES public.table_orders(id) ON DELETE SET NULL;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: addon_groups Addon groups are publicly readable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Addon groups are publicly readable" ON public.addon_groups FOR SELECT USING (true);


--
-- Name: addon_options Addon options are publicly readable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Addon options are publicly readable" ON public.addon_options FOR SELECT USING (true);


--
-- Name: addon_groups Admins can delete addon groups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete addon groups" ON public.addon_groups FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: addon_options Admins can delete addon options; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete addon options" ON public.addon_options FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: business_hours Admins can delete business hours; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete business hours" ON public.business_hours FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: categories Admins can delete categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete categories" ON public.categories FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: coupons Admins can delete coupons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete coupons" ON public.coupons FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: delivery_zones Admins can delete delivery zones; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete delivery zones" ON public.delivery_zones FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: product_addon_groups Admins can delete product addon groups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete product addon groups" ON public.product_addon_groups FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: products Admins can delete products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete products" ON public.products FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: table_order_items Admins can delete table order items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete table order items" ON public.table_order_items FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: table_orders Admins can delete table orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete table orders" ON public.table_orders FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: tables Admins can delete tables; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete tables" ON public.tables FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: waiters Admins can delete waiters; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete waiters" ON public.waiters FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: addon_groups Admins can insert addon groups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert addon groups" ON public.addon_groups FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: addon_options Admins can insert addon options; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert addon options" ON public.addon_options FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: business_hours Admins can insert business hours; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert business hours" ON public.business_hours FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: categories Admins can insert categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert categories" ON public.categories FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: coupons Admins can insert coupons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert coupons" ON public.coupons FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: delivery_zones Admins can insert delivery zones; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert delivery zones" ON public.delivery_zones FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: product_addon_groups Admins can insert product addon groups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert product addon groups" ON public.product_addon_groups FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: products Admins can insert products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert products" ON public.products FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: table_order_items Admins can insert table order items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert table order items" ON public.table_order_items FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: table_orders Admins can insert table orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert table orders" ON public.table_orders FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: tables Admins can insert tables; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert tables" ON public.tables FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: waiters Admins can insert waiters; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert waiters" ON public.waiters FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: addon_groups Admins can update addon groups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update addon groups" ON public.addon_groups FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: addon_options Admins can update addon options; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update addon options" ON public.addon_options FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: business_hours Admins can update business hours; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update business hours" ON public.business_hours FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: categories Admins can update categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update categories" ON public.categories FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: coupons Admins can update coupons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update coupons" ON public.coupons FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: delivery_zones Admins can update delivery zones; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update delivery zones" ON public.delivery_zones FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: product_addon_groups Admins can update product addon groups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update product addon groups" ON public.product_addon_groups FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: products Admins can update products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update products" ON public.products FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: store_config Admins can update store config; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update store config" ON public.store_config FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: table_order_items Admins can update table order items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update table order items" ON public.table_order_items FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: table_orders Admins can update table orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update table orders" ON public.table_orders FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: tables Admins can update tables; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update tables" ON public.tables FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: waiters Admins can update waiters; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update waiters" ON public.waiters FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: store_config Allow insert when table is empty; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow insert when table is empty" ON public.store_config FOR INSERT WITH CHECK ((NOT (EXISTS ( SELECT 1
   FROM public.store_config store_config_1))));


--
-- Name: order_items Anyone can create order items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can create order items" ON public.order_items FOR INSERT WITH CHECK (true);


--
-- Name: orders Anyone can create orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can create orders" ON public.orders FOR INSERT WITH CHECK (true);


--
-- Name: customer_addresses Anyone can delete addresses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can delete addresses" ON public.customer_addresses FOR DELETE USING (true);


--
-- Name: table_order_items Anyone can delete table order items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can delete table order items" ON public.table_order_items FOR DELETE USING (true);


--
-- Name: customer_addresses Anyone can insert addresses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert addresses" ON public.customer_addresses FOR INSERT WITH CHECK (true);


--
-- Name: table_order_items Anyone can insert table order items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert table order items" ON public.table_order_items FOR INSERT WITH CHECK (true);


--
-- Name: table_orders Anyone can insert table orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert table orders" ON public.table_orders FOR INSERT WITH CHECK (true);


--
-- Name: customer_addresses Anyone can update addresses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update addresses" ON public.customer_addresses FOR UPDATE USING (true);


--
-- Name: table_order_items Anyone can update table order items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update table order items" ON public.table_order_items FOR UPDATE USING (true);


--
-- Name: table_orders Anyone can update table orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update table orders" ON public.table_orders FOR UPDATE USING (true);


--
-- Name: customer_addresses Anyone can view addresses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view addresses" ON public.customer_addresses FOR SELECT USING (true);


--
-- Name: business_hours Business hours are publicly readable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Business hours are publicly readable" ON public.business_hours FOR SELECT USING (true);


--
-- Name: categories Categories are publicly readable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Categories are publicly readable" ON public.categories FOR SELECT USING (true);


--
-- Name: coupons Coupons are publicly readable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Coupons are publicly readable" ON public.coupons FOR SELECT USING (true);


--
-- Name: delivery_zones Delivery zones are publicly readable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Delivery zones are publicly readable" ON public.delivery_zones FOR SELECT USING (true);


--
-- Name: order_items Order items are publicly readable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Order items are publicly readable" ON public.order_items FOR SELECT USING (true);


--
-- Name: orders Orders are publicly readable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Orders are publicly readable" ON public.orders FOR SELECT USING (true);


--
-- Name: orders Orders can be updated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Orders can be updated" ON public.orders FOR UPDATE USING (true);


--
-- Name: product_addon_groups Product addon groups are publicly readable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Product addon groups are publicly readable" ON public.product_addon_groups FOR SELECT USING (true);


--
-- Name: products Products are publicly readable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Products are publicly readable" ON public.products FOR SELECT USING (true);


--
-- Name: store_config Store config is publicly readable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Store config is publicly readable" ON public.store_config FOR SELECT USING (true);


--
-- Name: table_order_items Table order items are publicly readable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Table order items are publicly readable" ON public.table_order_items FOR SELECT USING (true);


--
-- Name: table_order_items Table order items are readable by admins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Table order items are readable by admins" ON public.table_order_items FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: table_orders Table orders are publicly readable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Table orders are publicly readable" ON public.table_orders FOR SELECT USING (true);


--
-- Name: table_orders Table orders are readable by admins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Table orders are readable by admins" ON public.table_orders FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: tables Tables are publicly readable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tables are publicly readable" ON public.tables FOR SELECT USING (true);


--
-- Name: tables Tables are readable by admins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tables are readable by admins" ON public.tables FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: tables Tables can be updated by anyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tables can be updated by anyone" ON public.tables FOR UPDATE USING (true);


--
-- Name: user_roles Users can view own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: waiters Waiters are publicly readable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Waiters are publicly readable" ON public.waiters FOR SELECT USING (true);


--
-- Name: waiters Waiters are readable by admins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Waiters are readable by admins" ON public.waiters FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: addon_groups; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.addon_groups ENABLE ROW LEVEL SECURITY;

--
-- Name: addon_options; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.addon_options ENABLE ROW LEVEL SECURITY;

--
-- Name: business_hours; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;

--
-- Name: categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

--
-- Name: coupons; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

--
-- Name: customer_addresses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;

--
-- Name: delivery_zones; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;

--
-- Name: order_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

--
-- Name: orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

--
-- Name: product_addon_groups; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_addon_groups ENABLE ROW LEVEL SECURITY;

--
-- Name: products; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

--
-- Name: store_config; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.store_config ENABLE ROW LEVEL SECURITY;

--
-- Name: table_order_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.table_order_items ENABLE ROW LEVEL SECURITY;

--
-- Name: table_orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.table_orders ENABLE ROW LEVEL SECURITY;

--
-- Name: tables; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: waiters; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.waiters ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;