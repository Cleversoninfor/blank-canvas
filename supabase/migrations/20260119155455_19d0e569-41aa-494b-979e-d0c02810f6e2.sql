-- Add 'ready' as a valid status for orders
-- The orders table uses a text column for status, so we just need to ensure the application handles it
-- No schema change needed since status is already a text column

-- Update the comment to document valid statuses
COMMENT ON COLUMN public.orders.status IS 'Valid statuses: pending, preparing, ready, delivery, completed, cancelled';