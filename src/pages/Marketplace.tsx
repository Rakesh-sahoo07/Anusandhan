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
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/")}>
              ← Back to Editor
            </Button>
            <h1 className="text-2xl font-bold">Research Marketplace</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate("/projects")}>
              My Projects
            </Button>
            <Button variant="outline" onClick={() => navigate("/analytics")}>
              Analytics
            </Button>
            <WalletButton />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Browse Research NFTs</h2>
          <p className="text-muted-foreground">
            Discover and purchase AI research conversations as NFTs
          </p>
        </div>

        {listings.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground text-lg">
              No listings available yet. Create and mint your research to be the first!
            </p>
            <Button className="mt-4" onClick={() => navigate("/")}>
              Start Creating
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((listing) => (
              <Card key={listing.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-bold mb-2">{listing.projects.name}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {listing.projects.description || "No description provided"}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Token ID:</span>
                      <Badge variant="secondary">#{listing.projects.nft_token_id}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Project CID:</span>
                      <a
                        href={`https://gateway.lighthouse.storage/ipfs/${listing.projects.lighthouse_cid}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        {shortenCid(listing.projects.lighthouse_cid)}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Creator:</span>
                      <button
                        onClick={() => navigate(`/profile/${listing.projects.creator_wallet_address}`)}
                        className="font-mono text-xs hover:text-primary transition-colors"
                      >
                        {listing.projects.creator_wallet_address.slice(0, 6)}...
                        {listing.projects.creator_wallet_address.slice(-4)}
                      </button>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-2xl font-bold text-primary">
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
