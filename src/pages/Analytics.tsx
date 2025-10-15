import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, TrendingUp, ShoppingCart, Coins, Activity } from "lucide-react";
import { useWeb3 } from "@/contexts/Web3Context";
import { WalletButton } from "@/components/WalletButton";
import { toast } from "@/hooks/use-toast";

interface AnalyticsData {
  totalProjects: number;
  mintedNFTs: number;
  activeListings: number;
  totalSales: number;
  recentActivity: {
    id: string;
    type: string;
    description: string;
    timestamp: string;
  }[];
}

export default function Analytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const { walletAddress } = useWeb3();
  const navigate = useNavigate();

  useEffect(() => {
    if (walletAddress) {
      fetchAnalytics();
      
      // Set up realtime subscription for updates
      const channel = supabase
        .channel("analytics-updates")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "projects",
            filter: `owner_wallet_address=eq.${walletAddress}`,
          },
          () => {
            fetchAnalytics();
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "nft_listings",
            filter: `seller_wallet_address=eq.${walletAddress}`,
          },
          () => {
            fetchAnalytics();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      setAnalytics(null);
      setLoading(false);
    }
  }, [walletAddress]);

  const fetchAnalytics = async () => {
    if (!walletAddress) return;

    try {
      setLoading(true);

      // Fetch projects
      const { data: projects, error: projectsError } = await supabase
        .from("projects")
        .select("*")
        .eq("owner_wallet_address", walletAddress);

      if (projectsError) throw projectsError;

      // Fetch listings
      const { data: listings, error: listingsError } = await supabase
        .from("nft_listings")
        .select("*")
        .eq("seller_wallet_address", walletAddress);

      if (listingsError) throw listingsError;

      // Fetch transactions
      const { data: sales, error: salesError } = await supabase
        .from("transactions")
        .select("*")
        .eq("seller_wallet_address", walletAddress)
        .eq("transaction_status", "completed");

      if (salesError) throw salesError;

      // Build activity feed
      const recentActivity = [
        ...(projects || []).map((p) => ({
          id: p.id,
          type: "project",
          description: `Created project "${p.name}"`,
          timestamp: p.created_at,
        })),
        ...(listings || [])
          .filter((l) => l.listing_status === "active")
          .map((l) => ({
            id: l.id,
            type: "listing",
            description: `Listed NFT for ${l.price_pyusd} PYUSD`,
            timestamp: l.listed_at,
          })),
        ...(sales || []).map((s) => ({
          id: s.id,
          type: "sale",
          description: `Sold NFT for ${s.amount_pyusd} PYUSD`,
          timestamp: s.completed_at || s.created_at,
        })),
      ]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10);

      setAnalytics({
        totalProjects: projects?.length || 0,
        mintedNFTs: projects?.filter((p) => p.nft_status === "minted" || p.nft_status === "listed").length || 0,
        activeListings: listings?.filter((l) => l.listing_status === "active").length || 0,
        totalSales: sales?.length || 0,
        recentActivity,
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast({
        title: "Error",
        description: "Failed to load analytics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "project":
        return <Activity className="h-4 w-4 text-blue-500" />;
      case "listing":
        return <ShoppingCart className="h-4 w-4 text-purple-500" />;
      case "sale":
        return <Coins className="h-4 w-4 text-green-500" />;
      default:
        return <Activity className="h-4 w-4" />;
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
            <h1 className="text-2xl font-bold">Analytics</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate("/projects")}>
              My Projects
            </Button>
            <Button variant="outline" onClick={() => navigate("/marketplace")}>
              Marketplace
            </Button>
            <WalletButton />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {!walletAddress ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground text-lg mb-4">
              Connect your wallet to view your analytics
            </p>
            <WalletButton />
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics?.totalProjects || 0}</div>
                  <p className="text-xs text-muted-foreground">Research projects created</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Minted NFTs</CardTitle>
                  <Coins className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics?.mintedNFTs || 0}</div>
                  <p className="text-xs text-muted-foreground">Projects turned into NFTs</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Listings</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics?.activeListings || 0}</div>
                  <p className="text-xs text-muted-foreground">NFTs listed for sale</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics?.totalSales || 0}</div>
                  <p className="text-xs text-muted-foreground">Successful transactions</p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Your latest actions and transactions</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics?.recentActivity.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No activity yet. Start by creating a project!
                  </p>
                ) : (
                  <div className="space-y-4">
                    {analytics?.recentActivity.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-shrink-0">{getActivityIcon(activity.type)}</div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{activity.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(activity.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
