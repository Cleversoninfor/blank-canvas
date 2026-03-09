
-- Create drivers table
CREATE TABLE public.drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Drivers are publicly readable" ON public.drivers FOR SELECT USING (true);
CREATE POLICY "Admins can insert drivers" ON public.drivers FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update drivers" ON public.drivers FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete drivers" ON public.drivers FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Add driver columns to orders
ALTER TABLE public.orders ADD COLUMN driver_id uuid REFERENCES public.drivers(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN driver_name text;

-- Enable realtime for drivers
ALTER PUBLICATION supabase_realtime ADD TABLE public.drivers;
