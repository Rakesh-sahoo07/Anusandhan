import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Edit, ExternalLink, Twitter, Globe } from "lucide-react";
import { useWeb3 } from "@/contexts/Web3Context";
import { WalletButton } from "@/components/WalletButton";
import { toast } from "@/hooks/use-toast";
import { EditProfileDialog } from "@/components/EditProfileDialog";

interface UserProfile {
  id: string;
  wallet_address: string;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
  twitter_handle: string | null;
  website: string | null;
  created_at: string;
}

interface UserStats {
  totalProjects: number;
  mintedNFTs: number;
  totalSales: number;
  totalPurchases: number;
}

export default function Profile() {
  const { address } = useParams<{ address: string }>();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const { walletAddress } = useWeb3();
  const navigate = useNavigate();

  const isOwnProfile = walletAddress?.toLowerCase() === address?.toLowerCase();

  useEffect(() => {
    if (address) {
      fetchProfileData();
    }
  }, [address]);

  const fetchProfileData = async () => {
    if (!address) return;

    try {
      setLoading(true);

      // Fetch or create profile
      let { data: profileData, error: profileError } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("wallet_address", address)
        .maybeSingle();

      if (profileError && profileError.code !== "PGRST116") {
        throw profileError;
      }

      // Create profile if doesn't exist
      if (!profileData) {
        const { data: newProfile, error: createError } = await supabase
          .from("user_profiles")
          .insert({ wallet_address: address })
          .select()
          .single();

        if (createError) throw createError;
        profileData = newProfile;
      }

      setProfile(profileData);

      // Fetch stats
      const [projectsRes, salesRes, purchasesRes] = await Promise.all([
        supabase
          .from("projects")
          .select("*", { count: "exact", head: true })
          .eq("owner_wallet_address", address),
        supabase
          .from("transactions")
          .select("*", { count: "exact", head: true })
          .eq("seller_wallet_address", address)
          .eq("transaction_status", "completed"),
        supabase
          .from("transactions")
          .select("*", { count: "exact", head: true })
          .eq("buyer_wallet_address", address)
          .eq("transaction_status", "completed"),
      ]);

      const { data: projects } = await supabase
        .from("projects")
        .select("*")
        .eq("owner_wallet_address", address);

      setStats({
        totalProjects: projectsRes.count || 0,
        mintedNFTs: projects?.filter((p) => p.nft_status !== "draft").length || 0,
        totalSales: salesRes.count || 0,
        totalPurchases: purchasesRes.count || 0,
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast({
        title: "Error",
        description: "Failed to load profile",
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
              ← Back
            </Button>
            <h1 className="text-2xl font-bold">User Profile</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate("/marketplace")}>
              Marketplace
            </Button>
            <WalletButton />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Profile</CardTitle>
                {isOwnProfile && (
                  <Button size="sm" variant="outline" onClick={() => setEditDialogOpen(true)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center">
                <Avatar className="h-24 w-24 mb-4">
                  <AvatarFallback className="text-2xl">
                    {profile?.username?.[0]?.toUpperCase() || address?.slice(2, 4).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <h2 className="text-xl font-bold">
                  {profile?.username || `User ${address?.slice(0, 6)}`}
                </h2>
                <p className="text-sm text-muted-foreground font-mono">
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </p>
              </div>

              {profile?.bio && (
                <div>
                  <h3 className="text-sm font-medium mb-1">Bio</h3>
                  <p className="text-sm text-muted-foreground">{profile.bio}</p>
                </div>
              )}

              <div className="flex flex-col gap-2">
                {profile?.twitter_handle && (
                  <a
                    href={`https://twitter.com/${profile.twitter_handle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <Twitter className="h-4 w-4" />
                    @{profile.twitter_handle}
                  </a>
                )}
                {profile?.website && (
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <Globe className="h-4 w-4" />
                    Website
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>

              <div className="pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Member since {new Date(profile?.created_at || "").toLocaleDateString()}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Stats and Activity */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Projects</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.totalProjects || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>NFTs Minted</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.mintedNFTs || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Sales</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.totalSales || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Purchases</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.totalPurchases || 0}</div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity would go here */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  View transaction history for detailed activity
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  onClick={() => navigate(`/transactions/${address}`)}
                  className="w-full"
                >
                  View All Transactions
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {profile && (
        <EditProfileDialog
          profile={profile}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSuccess={fetchProfileData}
        />
      )}
    </div>
  );
}
