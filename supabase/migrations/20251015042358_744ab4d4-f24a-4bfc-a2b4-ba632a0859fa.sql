-- Drop the materialized view and replace with a regular function
DROP MATERIALIZED VIEW IF EXISTS public.marketplace_stats;

-- Create a function instead that computes stats on demand
CREATE OR REPLACE FUNCTION public.get_marketplace_stats()
RETURNS TABLE (
  total_listings BIGINT,
  active_listings BIGINT,
  sold_listings BIGINT,
  avg_sale_price NUMERIC,
  total_volume NUMERIC
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    COUNT(DISTINCT id)::BIGINT as total_listings,
    COUNT(DISTINCT CASE WHEN listing_status = 'active' THEN id END)::BIGINT as active_listings,
    COUNT(DISTINCT CASE WHEN listing_status = 'sold' THEN id END)::BIGINT as sold_listings,
    AVG(CASE WHEN listing_status = 'sold' THEN price_pyusd END) as avg_sale_price,
    SUM(CASE WHEN listing_status = 'sold' THEN price_pyusd ELSE 0 END) as total_volume
  FROM public.nft_listings;
$$;