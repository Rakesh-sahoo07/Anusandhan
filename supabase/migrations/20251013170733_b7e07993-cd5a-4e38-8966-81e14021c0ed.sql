-- Create enum for NFT status
CREATE TYPE public.nft_status AS ENUM ('draft', 'minted', 'listed', 'sold', 'delisted');

-- Create enum for listing status
CREATE TYPE public.listing_status AS ENUM ('active', 'sold', 'delisted');

-- Create enum for transaction status
CREATE TYPE public.transaction_status AS ENUM ('pending', 'completed', 'failed');

-- Create projects table
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  creator_wallet_address TEXT NOT NULL,
  owner_wallet_address TEXT NOT NULL,
  nft_status nft_status DEFAULT 'draft' NOT NULL,
  lighthouse_cid TEXT,
  metadata_cid TEXT,
  nft_contract_address TEXT,
  nft_token_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create NFT listings table
CREATE TABLE public.nft_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  price_pyusd DECIMAL(20, 6) NOT NULL CHECK (price_pyusd > 0),
  seller_wallet_address TEXT NOT NULL,
  listing_status listing_status DEFAULT 'active' NOT NULL,
  transaction_hash TEXT,
  listed_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  sold_at TIMESTAMP WITH TIME ZONE,
  delisted_at TIMESTAMP WITH TIME ZONE
);

-- Create project snapshots table
CREATE TABLE public.project_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  snapshot_data JSONB NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create transactions table
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  listing_id UUID REFERENCES public.nft_listings(id) ON DELETE SET NULL,
  buyer_wallet_address TEXT NOT NULL,
  seller_wallet_address TEXT NOT NULL,
  amount_pyusd DECIMAL(20, 6) NOT NULL,
  transaction_hash TEXT NOT NULL UNIQUE,
  transaction_status transaction_status DEFAULT 'pending' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nft_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for projects
CREATE POLICY "Anyone can view projects" ON public.projects
  FOR SELECT USING (true);

CREATE POLICY "Users can create their own projects" ON public.projects
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Owners can update their projects" ON public.projects
  FOR UPDATE USING (owner_wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address');

CREATE POLICY "Owners can delete their projects" ON public.projects
  FOR DELETE USING (owner_wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address');

-- RLS Policies for nft_listings
CREATE POLICY "Anyone can view active listings" ON public.nft_listings
  FOR SELECT USING (true);

CREATE POLICY "Sellers can create listings" ON public.nft_listings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Sellers can update their listings" ON public.nft_listings
  FOR UPDATE USING (seller_wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address');

-- RLS Policies for project_snapshots
CREATE POLICY "Anyone can view snapshots" ON public.project_snapshots
  FOR SELECT USING (true);

CREATE POLICY "Users can create snapshots" ON public.project_snapshots
  FOR INSERT WITH CHECK (true);

-- RLS Policies for transactions
CREATE POLICY "Anyone can view transactions" ON public.transactions
  FOR SELECT USING (true);

CREATE POLICY "Users can create transactions" ON public.transactions
  FOR INSERT WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_projects_owner ON public.projects(owner_wallet_address);
CREATE INDEX idx_projects_nft_status ON public.projects(nft_status);
CREATE INDEX idx_listings_status ON public.nft_listings(listing_status);
CREATE INDEX idx_listings_project ON public.nft_listings(project_id);
CREATE INDEX idx_snapshots_project ON public.project_snapshots(project_id);
CREATE INDEX idx_transactions_buyer ON public.transactions(buyer_wallet_address);
CREATE INDEX idx_transactions_seller ON public.transactions(seller_wallet_address);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for projects table
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();