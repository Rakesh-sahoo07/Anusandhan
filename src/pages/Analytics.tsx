import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, TrendingUp, ShoppingCart, Coins, Activity, Download, Calendar, FolderOpen } from "lucide-react";
import { useWeb3 } from "@/contexts/Web3Context";
import { WalletButton } from "@/components/WalletButton";
import { toast } from "@/hooks/use-toast";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

export default function Analytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [salesTrend, setSalesTrend] = useState<any[]>([]);
  const [projectDistribution, setProjectDistribution] = useState<any[]>([]);
  const [topCreators, setTopCreators] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState<string>("7");
  const { walletAddress } = useWeb3();
  const navigate = useNavigate();

  useEffect(() => {
    if (walletAddress) {
      fetchAnalytics();
      fetchSalesTrend();
      fetchProjectDistribution();
      fetchTopCreators();
      
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
            fetchProjectDistribution();
            fetchTopCreators();
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
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "transactions",
          },
          () => {
            fetchSalesTrend();
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
  }, [walletAddress, dateRange]);

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

  const fetchSalesTrend = async () => {
    const daysAgo = parseInt(dateRange);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    const { data, error } = await supabase
      .from('transactions')
      .select('created_at, amount_pyusd')
      .gte('created_at', startDate.toISOString())
      .eq('transaction_status', 'completed')
      .order('created_at', { ascending: true });

    if (data && !error) {
      // Group by date
      const grouped = data.reduce((acc: any, tx: any) => {
        const date = new Date(tx.created_at).toLocaleDateString();
        if (!acc[date]) {
          acc[date] = { date, sales: 0, volume: 0 };
        }
        acc[date].sales += 1;
        acc[date].volume += parseFloat(tx.amount_pyusd);
        return acc;
      }, {});

      setSalesTrend(Object.values(grouped));
    }
  };

  const fetchProjectDistribution = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('nft_status');

    if (data && !error) {
      const distribution = data.reduce((acc: any, project: any) => {
        const status = project.nft_status || 'draft';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});

      setProjectDistribution(
        Object.entries(distribution).map(([name, value]) => ({ name, value }))
      );
    }
  };

  const fetchTopCreators = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('creator_wallet_address')
      .eq('nft_status', 'minted');

    if (data && !error) {
      const creators = data.reduce((acc: any, project: any) => {
        const address = project.creator_wallet_address;
        acc[address] = (acc[address] || 0) + 1;
        return acc;
      }, {});

      const sorted = Object.entries(creators)
        .map(([address, count]) => ({
          address: `${address.slice(0, 6)}...${address.slice(-4)}`,
          fullAddress: address,
          nfts: count
        }))
        .sort((a: any, b: any) => b.nfts - a.nfts)
        .slice(0, 10);

      setTopCreators(sorted);
    }
  };

  const exportData = () => {
    const data = {
      analytics,
      salesTrend,
      projectDistribution,
      topCreators,
      dateRange: `Last ${dateRange} days`,
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    toast({
      title: "Success",
      description: "Analytics data exported successfully",
    });
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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <header className="border-b border-white/20 bg-black/40 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate("/")}
              className="text-white hover:bg-white/10"
            >
              ← Back to Editor
            </Button>
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          </div>
          <TooltipProvider>
            <div className="flex items-center gap-2">
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-[180px] bg-white/5 text-white border-white/20 hover:bg-white/10">
                  <Calendar className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent className="bg-black/95 backdrop-blur-xl border-white/20 text-white">
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
              
              <UITooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={exportData}
                    className="text-white hover:bg-white/10"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Export analytics data</p>
                </TooltipContent>
              </UITooltip>
              
              <UITooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => navigate("/projects")}
                    className="text-white hover:bg-white/10"
                  >
                    <FolderOpen className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>My Projects</p>
                </TooltipContent>
              </UITooltip>
              
              <UITooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => navigate("/marketplace")}
                    className="text-white hover:bg-white/10"
                  >
                    <ShoppingCart className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Marketplace</p>
                </TooltipContent>
              </UITooltip>
              
              <WalletButton />
            </div>
          </TooltipProvider>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {!walletAddress ? (
          <Card className="p-12 text-center bg-white/5 backdrop-blur-xl border-white/20">
            <p className="text-white text-lg mb-4">
              Connect your wallet to view your analytics
            </p>
            <WalletButton />
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="relative bg-white/5 backdrop-blur-xl border-white/20 overflow-hidden group">
                {/* Corner borders */}
                <div className="absolute top-0 left-0 w-8 h-8 transition-all group-hover:w-12 group-hover:h-12">
                  <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-white/80 to-transparent" />
                  <div className="absolute top-0 left-0 w-[1px] h-full bg-gradient-to-b from-white/80 to-transparent" />
                </div>
                <div className="absolute bottom-0 right-0 w-8 h-8 transition-all group-hover:w-12 group-hover:h-12">
                  <div className="absolute bottom-0 right-0 w-full h-[1px] bg-gradient-to-l from-white/80 to-transparent" />
                  <div className="absolute bottom-0 right-0 w-[1px] h-full bg-gradient-to-t from-white/80 to-transparent" />
                </div>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                  <CardTitle className="text-sm font-medium text-white">Total Projects</CardTitle>
                  <Activity className="h-4 w-4 text-white/60" />
                </CardHeader>
                <CardContent className="relative z-10">
                  <div className="text-2xl font-bold text-white">{analytics?.totalProjects || 0}</div>
                  <p className="text-xs text-white/60">Research projects created</p>
                </CardContent>
              </Card>

              <Card className="relative bg-white/5 backdrop-blur-xl border-white/20 overflow-hidden group">
                {/* Corner borders */}
                <div className="absolute top-0 left-0 w-8 h-8 transition-all group-hover:w-12 group-hover:h-12">
                  <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-white/80 to-transparent" />
                  <div className="absolute top-0 left-0 w-[1px] h-full bg-gradient-to-b from-white/80 to-transparent" />
                </div>
                <div className="absolute bottom-0 right-0 w-8 h-8 transition-all group-hover:w-12 group-hover:h-12">
                  <div className="absolute bottom-0 right-0 w-full h-[1px] bg-gradient-to-l from-white/80 to-transparent" />
                  <div className="absolute bottom-0 right-0 w-[1px] h-full bg-gradient-to-t from-white/80 to-transparent" />
                </div>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                  <CardTitle className="text-sm font-medium text-white">Minted NFTs</CardTitle>
                  <Coins className="h-4 w-4 text-white/60" />
                </CardHeader>
                <CardContent className="relative z-10">
                  <div className="text-2xl font-bold text-white">{analytics?.mintedNFTs || 0}</div>
                  <p className="text-xs text-white/60">Projects turned into NFTs</p>
                </CardContent>
              </Card>

              <Card className="relative bg-white/5 backdrop-blur-xl border-white/20 overflow-hidden group">
                {/* Corner borders */}
                <div className="absolute top-0 left-0 w-8 h-8 transition-all group-hover:w-12 group-hover:h-12">
                  <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-white/80 to-transparent" />
                  <div className="absolute top-0 left-0 w-[1px] h-full bg-gradient-to-b from-white/80 to-transparent" />
                </div>
                <div className="absolute bottom-0 right-0 w-8 h-8 transition-all group-hover:w-12 group-hover:h-12">
                  <div className="absolute bottom-0 right-0 w-full h-[1px] bg-gradient-to-l from-white/80 to-transparent" />
                  <div className="absolute bottom-0 right-0 w-[1px] h-full bg-gradient-to-t from-white/80 to-transparent" />
                </div>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                  <CardTitle className="text-sm font-medium text-white">Active Listings</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-white/60" />
                </CardHeader>
                <CardContent className="relative z-10">
                  <div className="text-2xl font-bold text-white">{analytics?.activeListings || 0}</div>
                  <p className="text-xs text-white/60">NFTs listed for sale</p>
                </CardContent>
              </Card>

              <Card className="relative bg-white/5 backdrop-blur-xl border-white/20 overflow-hidden group">
                {/* Corner borders */}
                <div className="absolute top-0 left-0 w-8 h-8 transition-all group-hover:w-12 group-hover:h-12">
                  <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-white/80 to-transparent" />
                  <div className="absolute top-0 left-0 w-[1px] h-full bg-gradient-to-b from-white/80 to-transparent" />
                </div>
                <div className="absolute bottom-0 right-0 w-8 h-8 transition-all group-hover:w-12 group-hover:h-12">
                  <div className="absolute bottom-0 right-0 w-full h-[1px] bg-gradient-to-l from-white/80 to-transparent" />
                  <div className="absolute bottom-0 right-0 w-[1px] h-full bg-gradient-to-t from-white/80 to-transparent" />
                </div>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                  <CardTitle className="text-sm font-medium text-white">Total Sales</CardTitle>
                  <TrendingUp className="h-4 w-4 text-white/60" />
                </CardHeader>
                <CardContent className="relative z-10">
                  <div className="text-2xl font-bold text-white">{analytics?.totalSales || 0}</div>
                  <p className="text-xs text-white/60">Successful transactions</p>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row 1 */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="relative bg-white/5 backdrop-blur-xl border-white/20 overflow-hidden group">
                {/* Corner borders */}
                <div className="absolute top-0 left-0 w-8 h-8 transition-all group-hover:w-12 group-hover:h-12 z-10">
                  <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-white/80 to-transparent" />
                  <div className="absolute top-0 left-0 w-[1px] h-full bg-gradient-to-b from-white/80 to-transparent" />
                </div>
                <div className="absolute bottom-0 right-0 w-8 h-8 transition-all group-hover:w-12 group-hover:h-12 z-10">
                  <div className="absolute bottom-0 right-0 w-full h-[1px] bg-gradient-to-l from-white/80 to-transparent" />
                  <div className="absolute bottom-0 right-0 w-[1px] h-full bg-gradient-to-t from-white/80 to-transparent" />
                </div>
                <CardHeader className="relative z-20">
                  <CardTitle className="text-white">Sales Trend</CardTitle>
                  <CardDescription className="text-white/60">Track sales volume over time</CardDescription>
                </CardHeader>
                <CardContent className="relative z-20">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={salesTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis dataKey="date" stroke="rgba(255,255,255,0.6)" />
                      <YAxis stroke="rgba(255,255,255,0.6)" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(0,0,0,0.9)', 
                          border: '1px solid rgba(255,255,255,0.2)',
                          borderRadius: '8px',
                          backdropFilter: 'blur(12px)'
                        }} 
                      />
                      <Legend wrapperStyle={{ color: '#fff' }} />
                      <Line type="monotone" dataKey="sales" stroke="#ffffff" strokeWidth={2} name="Sales" />
                      <Line type="monotone" dataKey="volume" stroke="rgba(255,255,255,0.6)" strokeWidth={2} name="Volume (PYUSD)" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="relative bg-white/5 backdrop-blur-xl border-white/20 overflow-hidden group">
                {/* Corner borders */}
                <div className="absolute top-0 left-0 w-8 h-8 transition-all group-hover:w-12 group-hover:h-12 z-10">
                  <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-white/80 to-transparent" />
                  <div className="absolute top-0 left-0 w-[1px] h-full bg-gradient-to-b from-white/80 to-transparent" />
                </div>
                <div className="absolute bottom-0 right-0 w-8 h-8 transition-all group-hover:w-12 group-hover:h-12 z-10">
                  <div className="absolute bottom-0 right-0 w-full h-[1px] bg-gradient-to-l from-white/80 to-transparent" />
                  <div className="absolute bottom-0 right-0 w-[1px] h-full bg-gradient-to-t from-white/80 to-transparent" />
                </div>
                <CardHeader className="relative z-20">
                  <CardTitle className="text-white">Project Distribution</CardTitle>
                  <CardDescription className="text-white/60">Status breakdown of all projects</CardDescription>
                </CardHeader>
                <CardContent className="relative z-20">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={projectDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={100}
                        fill="#ffffff"
                        dataKey="value"
                      >
                        {projectDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(0,0,0,0.9)', 
                          border: '1px solid rgba(255,255,255,0.2)',
                          borderRadius: '8px',
                          backdropFilter: 'blur(12px)',
                          color: '#fff'
                        }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row 2 */}
            <Card className="relative bg-white/5 backdrop-blur-xl border-white/20 overflow-hidden group">
              {/* Corner borders */}
              <div className="absolute top-0 left-0 w-8 h-8 transition-all group-hover:w-12 group-hover:h-12 z-10">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-white/80 to-transparent" />
                <div className="absolute top-0 left-0 w-[1px] h-full bg-gradient-to-b from-white/80 to-transparent" />
              </div>
              <div className="absolute bottom-0 right-0 w-8 h-8 transition-all group-hover:w-12 group-hover:h-12 z-10">
                <div className="absolute bottom-0 right-0 w-full h-[1px] bg-gradient-to-l from-white/80 to-transparent" />
                <div className="absolute bottom-0 right-0 w-[1px] h-full bg-gradient-to-t from-white/80 to-transparent" />
              </div>
              <CardHeader className="relative z-20">
                <CardTitle className="text-white">Top Creators</CardTitle>
                <CardDescription className="text-white/60">Most active NFT creators on the platform</CardDescription>
              </CardHeader>
              <CardContent className="relative z-20">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topCreators}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="address" stroke="rgba(255,255,255,0.6)" />
                    <YAxis stroke="rgba(255,255,255,0.6)" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(0,0,0,0.9)', 
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px',
                        backdropFilter: 'blur(12px)',
                        color: '#fff'
                      }} 
                    />
                    <Bar dataKey="nfts" fill="#ffffff" name="NFTs Minted" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="relative bg-white/5 backdrop-blur-xl border-white/20 overflow-hidden group">
              {/* Corner borders */}
              <div className="absolute top-0 left-0 w-8 h-8 transition-all group-hover:w-12 group-hover:h-12 z-10">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-white/80 to-transparent" />
                <div className="absolute top-0 left-0 w-[1px] h-full bg-gradient-to-b from-white/80 to-transparent" />
              </div>
              <div className="absolute bottom-0 right-0 w-8 h-8 transition-all group-hover:w-12 group-hover:h-12 z-10">
                <div className="absolute bottom-0 right-0 w-full h-[1px] bg-gradient-to-l from-white/80 to-transparent" />
                <div className="absolute bottom-0 right-0 w-[1px] h-full bg-gradient-to-t from-white/80 to-transparent" />
              </div>
              <CardHeader className="relative z-20">
                <CardTitle className="text-white">Recent Activity</CardTitle>
                <CardDescription className="text-white/60">Your latest actions and transactions</CardDescription>
              </CardHeader>
              <CardContent className="relative z-20">
                {analytics?.recentActivity.length === 0 ? (
                  <p className="text-center text-white/60 py-8">
                    No activity yet. Start by creating a project!
                  </p>
                ) : (
                  <div className="space-y-4">
                    {analytics?.recentActivity.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-center gap-4 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
                      >
                        <div className="flex-shrink-0">{getActivityIcon(activity.type)}</div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">{activity.description}</p>
                          <p className="text-xs text-white/60">
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
