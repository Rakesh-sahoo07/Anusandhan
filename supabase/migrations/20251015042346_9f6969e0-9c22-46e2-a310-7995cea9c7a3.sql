-- Create user profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address TEXT NOT NULL UNIQUE,
  username TEXT,
  bio TEXT,
  avatar_url TEXT,
  twitter_handle TEXT,
  website TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Profiles are viewable by everyone" 
ON public.user_profiles 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create their own profile" 
ON public.user_profiles 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update their own profile" 
ON public.user_profiles 
FOR UPDATE 
USING (wallet_address = ((current_setting('request.jwt.claims'::text, true))::json ->> 'wallet_address'::text));

-- Add trigger for updated_at
CREATE TRIGGER update_user_profiles_updated_at
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes
CREATE INDEX idx_user_profiles_wallet ON public.user_profiles(wallet_address);

-- Add view count to projects
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- Create a materialized view for marketplace stats
CREATE MATERIALIZED VIEW IF NOT EXISTS public.marketplace_stats AS
SELECT 
  COUNT(DISTINCT id) as total_listings,
  COUNT(DISTINCT CASE WHEN listing_status = 'active' THEN id END) as active_listings,
  COUNT(DISTINCT CASE WHEN listing_status = 'sold' THEN id END) as sold_listings,
  AVG(CASE WHEN listing_status = 'sold' THEN price_pyusd END) as avg_sale_price,
  SUM(CASE WHEN listing_status = 'sold' THEN price_pyusd ELSE 0 END) as total_volume
FROM public.nft_listings;

-- Create index on materialized view
CREATE UNIQUE INDEX idx_marketplace_stats ON public.marketplace_stats((1));