-- Create system_settings table
CREATE TABLE IF NOT EXISTS public.system_settings (
    id INT PRIMARY KEY DEFAULT 1,
    stock_enabled BOOLEAN DEFAULT true,
    product_stock_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure only one row can exist
ALTER TABLE public.system_settings DROP CONSTRAINT IF EXISTS enforce_single_row;
ALTER TABLE public.system_settings ADD CONSTRAINT enforce_single_row CHECK (id = 1);

-- Insert initial row
INSERT INTO public.system_settings (id, stock_enabled, product_stock_enabled)
VALUES (1, true, true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Safely drop old policies if they exist, then recreate
DROP POLICY IF EXISTS "Allow authenticated users to read system_settings" ON public.system_settings;
CREATE POLICY "Allow authenticated users to read system_settings"
ON public.system_settings FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to manage system_settings" ON public.system_settings;
CREATE POLICY "Allow authenticated users to manage system_settings"
ON public.system_settings FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Trigger for updated_at on system_settings
CREATE OR REPLACE FUNCTION public.handle_system_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_system_settings_updated_at ON public.system_settings;
CREATE TRIGGER set_system_settings_updated_at
    BEFORE UPDATE ON public.system_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_system_settings_updated_at();

-- Update create_order_with_items to respect stock_enabled
CREATE OR REPLACE FUNCTION public.create_order_with_items(
  _customer_name text,
  _customer_phone text,
  _address_street text,
  _address_number text,
  _address_neighborhood text,
  _total_amount numeric,
  _payment_method text,
  _items jsonb,
  _address_complement text DEFAULT NULL,
  _address_reference text DEFAULT NULL,
  _change_for numeric DEFAULT NULL,
  _latitude double precision DEFAULT NULL,
  _longitude double precision DEFAULT NULL
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _order_id integer;
  _item jsonb;
  _product_id uuid;
  _quantity integer;
  _prod_rec record;
  _ing_rec record;
  _available_stock numeric;
  _required_stock numeric;
  _stock_enabled boolean;
BEGIN

  -- Check if global stock is enabled
  SELECT stock_enabled INTO _stock_enabled FROM public.system_settings WHERE id = 1;
  IF _stock_enabled IS NULL THEN 
    _stock_enabled := true; 
  END IF;

  -- FIRST PASS: VALIDATE STOCK (ONLY IF ENABLED)
  IF _stock_enabled THEN
    FOR _item IN SELECT * FROM jsonb_array_elements(_items)
    LOOP
      _product_id := (_item->>'product_id')::uuid;
      _quantity := (_item->>'quantity')::integer;

      IF _product_id IS NOT NULL THEN
        SELECT * INTO _prod_rec FROM products WHERE id = _product_id;
        
        IF FOUND THEN
          -- Check unit stock
          IF _prod_rec.stock_type = 'unit' THEN
            IF _prod_rec.stock_quantity < _quantity THEN
              RAISE EXCEPTION 'Estoque insuficiente para o produto %: disponível %, solicitado %', _prod_rec.name, _prod_rec.stock_quantity, _quantity;
            END IF;
          
          -- Check ingredient stock
          ELSIF _prod_rec.stock_type = 'ingredient' THEN
            FOR _ing_rec IN (
              SELECT i.name, i.stock_quantity, pi.quantity_used 
              FROM product_ingredients pi
              JOIN ingredients i ON i.id = pi.ingredient_id
              WHERE pi.product_id = _prod_rec.id
            ) LOOP
              _required_stock := _ing_rec.quantity_used * _quantity;
              IF _ing_rec.stock_quantity < _required_stock THEN
                RAISE EXCEPTION 'Estoque insuficiente para o ingrediente % do produto %: disponível %, necessário %', _ing_rec.name, _prod_rec.name, _ing_rec.stock_quantity, _required_stock;
              END IF;
            END LOOP;
          END IF;
        END IF;
      END IF;
    END LOOP;
  END IF;

  -- SECOND PASS: CREATE ORDER AND REDUCE STOCK (ORDER IS ALWAYS CREATED)
  INSERT INTO public.orders (
    customer_name, customer_phone, address_street, address_number,
    address_neighborhood, address_complement, address_reference,
    total_amount, payment_method, change_for, latitude, longitude, status
  ) VALUES (
    _customer_name, _customer_phone, _address_street, _address_number,
    _address_neighborhood, _address_complement, _address_reference,
    _total_amount, _payment_method, _change_for, _latitude, _longitude, 'pending'
  ) RETURNING id INTO _order_id;

  FOR _item IN SELECT * FROM jsonb_array_elements(_items)
  LOOP
    _product_id := (_item->>'product_id')::uuid;
    _quantity := (_item->>'quantity')::integer;

    INSERT INTO public.order_items (order_id, product_id, product_name, quantity, unit_price, observation)
    VALUES (
      _order_id,
      _product_id,
      _item->>'product_name',
      _quantity,
      (_item->>'unit_price')::numeric,
      _item->>'observation'
    );

    -- REDUCE STOCK (ONLY IF ENABLED)
    IF _stock_enabled AND _product_id IS NOT NULL THEN
      SELECT * INTO _prod_rec FROM products WHERE id = _product_id;
      
      IF FOUND THEN
        IF _prod_rec.stock_type = 'unit' THEN
          UPDATE products 
          SET stock_quantity = stock_quantity - _quantity 
          WHERE id = _prod_rec.id;
        ELSIF _prod_rec.stock_type = 'ingredient' THEN
          FOR _ing_rec IN (SELECT ingredient_id, quantity_used FROM product_ingredients WHERE product_id = _prod_rec.id) LOOP
            UPDATE ingredients 
            SET stock_quantity = stock_quantity - (_ing_rec.quantity_used * _quantity)
            WHERE id = _ing_rec.ingredient_id;
          END LOOP;
        END IF;
      END IF;
    END IF;
  END LOOP;

  RETURN _order_id;
END;
$$;
