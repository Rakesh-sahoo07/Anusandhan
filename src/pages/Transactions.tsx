import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ExternalLink, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { useWeb3 } from "@/contexts/Web3Context";
import { WalletButton } from "@/components/WalletButton";
import { toast } from "@/hooks/use-toast";

interface Transaction {
  id: string;
  buyer_wallet_address: string;
  seller_wallet_address: string;
  amount_pyusd: number;
  transaction_hash: string;
  transaction_status: string;
  created_at: string;
  completed_at: string | null;
}

export default function Transactions() {
  const { address } = useParams<{ address?: string }>();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { walletAddress, chainId } = useWeb3();
  const navigate = useNavigate();

  const targetAddress = address || walletAddress;

  useEffect(() => {
    if (targetAddress) {
      fetchTransactions();
    } else {
      setLoading(false);
    }
  }, [targetAddress]);

  const fetchTransactions = async () => {
    if (!targetAddress) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .or(`buyer_wallet_address.eq.${targetAddress},seller_wallet_address.eq.${targetAddress}`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      toast({
        title: "Error",
        description: "Failed to load transactions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getTransactionType = (tx: Transaction) => {
    return tx.buyer_wallet_address.toLowerCase() === targetAddress?.toLowerCase()
      ? "purchase"
      : "sale";
  };

  const getBlockExplorerUrl = (hash: string) => {
    const explorers: Record<number, string> = {
      1: "https://etherscan.io",
      137: "https://polygonscan.com",
    };
    return chainId ? `${explorers[chainId]}/tx/${hash}` : "#";
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
            <Button variant="ghost" onClick={() => navigate(-1)}>
              ← Back
            </Button>
            <h1 className="text-2xl font-bold">Transaction History</h1>
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
        {!targetAddress ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground text-lg mb-4">
              Connect your wallet to view your transaction history
            </p>
            <WalletButton />
          </Card>
        ) : transactions.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground text-lg">
              No transactions yet. Start by purchasing or selling NFTs!
            </p>
            <Button className="mt-4" onClick={() => navigate("/marketplace")}>
              Browse Marketplace
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {transactions.map((tx) => {
              const type = getTransactionType(tx);
              const isIncoming = type === "purchase";

              return (
                <Card key={tx.id} className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div
                        className={`p-3 rounded-full ${
                          isIncoming ? "bg-green-500/10" : "bg-blue-500/10"
                        }`}
                      >
                        {isIncoming ? (
                          <ArrowDownLeft className="h-5 w-5 text-green-500" />
                        ) : (
                          <ArrowUpRight className="h-5 w-5 text-blue-500" />
                        )}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">
                            {isIncoming ? "Purchase" : "Sale"}
                          </h3>
                          <Badge
                            variant={
                              tx.transaction_status === "completed"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {tx.transaction_status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {isIncoming ? "From" : "To"}:{" "}
                          <span className="font-mono">
                            {(isIncoming
                              ? tx.seller_wallet_address
                              : tx.buyer_wallet_address
                            )
                              .slice(0, 6)}
                            ...
                            {(isIncoming
                              ? tx.seller_wallet_address
                              : tx.buyer_wallet_address
                            ).slice(-4)}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(
                            tx.completed_at || tx.created_at
                          ).toLocaleString()}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary">
                          {isIncoming ? "+" : "-"}
                          {tx.amount_pyusd} PYUSD
                        </p>
                        <a
                          href={getBlockExplorerUrl(tx.transaction_hash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline flex items-center gap-1 justify-end mt-1"
                        >
                          View on Explorer
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
