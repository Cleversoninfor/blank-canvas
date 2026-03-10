
-- Create storage buckets for images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('product-images', 'product-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('store-assets', 'store-assets', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

-- Allow public read access
CREATE POLICY "Public read access for product images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'product-images');

CREATE POLICY "Public read access for store assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'store-assets');

-- Allow authenticated users (admins) to upload
CREATE POLICY "Authenticated users can upload product images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Authenticated users can upload store assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'store-assets');

-- Allow authenticated users to update
CREATE POLICY "Authenticated users can update product images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'product-images');

CREATE POLICY "Authenticated users can update store assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'store-assets');

-- Allow authenticated users to delete
CREATE POLICY "Authenticated users can delete product images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'product-images');

CREATE POLICY "Authenticated users can delete store assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'store-assets');
