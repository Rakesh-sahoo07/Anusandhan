import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ExternalLink, ShoppingCart } from "lucide-react";
import { useWeb3 } from "@/contexts/Web3Context";
import { WalletButton } from "@/components/WalletButton";
import { toast } from "@/hooks/use-toast";
import { shortenCid } from "@/utils/ipfs";
import { PurchaseDialog } from "@/components/PurchaseDialog";

interface Listing {
  id: string;
  project_id: string;
  price_pyusd: number;
  seller_wallet_address: string;
  listing_status: string;
  listed_at: string;
  projects: {
    name: string;
    description: string;
    lighthouse_cid: string;
    metadata_cid: string;
    nft_token_id: string;
    creator_wallet_address: string;
  };
}

export default function Marketplace() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const { walletAddress } = useWeb3();
  const navigate = useNavigate();

  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    try {
      const { data, error } = await supabase
        .from("nft_listings")
        .select(`
          *,
          projects (
            name,
            description,
            lighthouse_cid,
            metadata_cid,
            nft_token_id,
            creator_wallet_address
          )
        `)
        .eq("listing_status", "active")
        .order("listed_at", { ascending: false });

      if (error) throw error;
      setListings(data || []);
    } catch (error) {
      console.error("Error fetching listings:", error);
      toast({
        title: "Error",
        description: "Failed to load marketplace listings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <header className="border-b border-white/20 bg-black/40 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/")} className="text-white hover:bg-white/10">
              ← Back to Editor
            </Button>
            <h1 className="text-2xl font-bold text-white">Marketplace</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate("/analytics")} className="border-white/20 text-white hover:bg-white/10">
              Analytics
            </Button>
            <WalletButton />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2 text-white">Browse Research NFTs</h2>
          <p className="text-white/60">
            Discover and purchase AI research conversations as NFTs
          </p>
        </div>

        {listings.length === 0 ? (
          <Card className="p-12 text-center bg-white/5 backdrop-blur-xl border-white/20">
            <p className="text-white/60 text-lg">
              No listings available yet. Create and mint your research to be the first!
            </p>
            <Button className="mt-4" onClick={() => navigate("/")}>
              Start Creating
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((listing) => (
              <Card key={listing.id} className="p-6 bg-white/5 backdrop-blur-xl border-white/20 transition-all duration-300 group relative overflow-hidden">
                {/* Corner borders with gradient blend */}
                <div className="absolute top-0 left-0 w-8 h-px bg-gradient-to-r from-white/80 to-transparent transition-all duration-300 group-hover:w-12" />
                <div className="absolute top-0 left-0 w-px h-8 bg-gradient-to-b from-white/80 to-transparent transition-all duration-300 group-hover:h-12" />
                <div className="absolute top-0 right-0 w-8 h-px bg-gradient-to-l from-white/80 to-transparent transition-all duration-300 group-hover:w-12" />
                <div className="absolute top-0 right-0 w-px h-8 bg-gradient-to-b from-white/80 to-transparent transition-all duration-300 group-hover:h-12" />
                <div className="absolute bottom-0 left-0 w-8 h-px bg-gradient-to-r from-white/80 to-transparent transition-all duration-300 group-hover:w-12" />
                <div className="absolute bottom-0 left-0 w-px h-8 bg-gradient-to-t from-white/80 to-transparent transition-all duration-300 group-hover:h-12" />
                <div className="absolute bottom-0 right-0 w-8 h-px bg-gradient-to-l from-white/80 to-transparent transition-all duration-300 group-hover:w-12" />
                <div className="absolute bottom-0 right-0 w-px h-8 bg-gradient-to-t from-white/80 to-transparent transition-all duration-300 group-hover:h-12" />
                
                <div className="space-y-4 relative z-10">
                  <div>
                    <h3 className="text-xl font-bold mb-2 text-white">{listing.projects.name}</h3>
                    <p className="text-sm text-white/60 line-clamp-3">
                      {listing.projects.description || "No description provided"}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/60">Token ID:</span>
                      <Badge variant="secondary" className="bg-white/10 text-white border-white/20">#{listing.projects.nft_token_id}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/60">Project CID:</span>
                      <a
                        href={`https://gateway.lighthouse.storage/ipfs/${listing.projects.lighthouse_cid}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white hover:text-white/80 flex items-center gap-1 transition-colors"
                      >
                        {shortenCid(listing.projects.lighthouse_cid)}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/60">Creator:</span>
                      <button
                        onClick={() => navigate(`/profile/${listing.projects.creator_wallet_address}`)}
                        className="font-mono text-xs text-white hover:text-white/80 transition-colors"
                      >
                        {listing.projects.creator_wallet_address.slice(0, 6)}...
                        {listing.projects.creator_wallet_address.slice(-4)}
                      </button>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/20">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-2xl font-bold text-white">
                        {listing.price_pyusd} PYUSD
                      </span>
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => setSelectedListing(listing)}
                      disabled={!walletAddress || walletAddress.toLowerCase() === listing.seller_wallet_address.toLowerCase()}
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      {!walletAddress
                        ? "Connect Wallet to Buy"
                        : walletAddress.toLowerCase() === listing.seller_wallet_address.toLowerCase()
                        ? "You Own This"
                        : "Purchase NFT"}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      {selectedListing && (
        <PurchaseDialog
          listing={selectedListing}
          open={!!selectedListing}
          onOpenChange={(open) => !open && setSelectedListing(null)}
          onSuccess={fetchListings}
        />
      )}
    </div>
  );
}
