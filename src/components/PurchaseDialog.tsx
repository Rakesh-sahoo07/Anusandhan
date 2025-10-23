import { useState } from "react";
import { ethers } from "ethers";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useWeb3 } from "@/contexts/Web3Context";
import { toast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getContractAddress, MARKETPLACE_ABI, ERC20_ABI } from "@/lib/contracts";

interface PurchaseDialogProps {
  listing: {
    id: string;
    project_id: string;
    price_pyusd: number;
    seller_wallet_address: string;
    projects: {
      name: string;
      nft_token_id: string;
    };
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function PurchaseDialog({ listing, open, onOpenChange, onSuccess }: PurchaseDialogProps) {
  const [status, setStatus] = useState<"idle" | "approving" | "purchasing" | "success">("idle");
  const [txHash, setTxHash] = useState<string>("");
  const { walletAddress, chainId } = useWeb3();

  const handlePurchase = async () => {
    if (!walletAddress || !chainId) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to continue",
        variant: "destructive",
      });
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const marketplaceAddress = getContractAddress(chainId, "MARKETPLACE");
      const pyusdAddress = getContractAddress(chainId, "PYUSD");
      
      const marketplace = new ethers.Contract(marketplaceAddress, MARKETPLACE_ABI, signer);
      const pyusd = new ethers.Contract(pyusdAddress, ERC20_ABI, signer);

      const priceInWei = ethers.parseUnits(listing.price_pyusd.toString(), 6); // PYUSD has 6 decimals

      // Step 1: Approve PYUSD
      setStatus("approving");
      toast({
        title: "Approval Required",
        description: "Please approve PYUSD spending in your wallet",
      });

      const allowance = await pyusd.allowance(walletAddress, marketplaceAddress);
      if (allowance < priceInWei) {
        const approveTx = await pyusd.approve(marketplaceAddress, priceInWei);
        await approveTx.wait();
      }

      // Step 2: Purchase NFT
      setStatus("purchasing");
      toast({
        title: "Processing Purchase",
        description: "Please confirm the purchase transaction",
      });

      const purchaseTx = await marketplace.purchaseNFT(listing.projects.nft_token_id);
      const receipt = await purchaseTx.wait();
      setTxHash(receipt.hash);

      // Step 3: Duplicate project for buyer
      const { data: duplicateResult, error: duplicateError } = await supabase.functions.invoke('duplicate-project', {
        body: {
          original_project_id: listing.project_id,
          buyer_wallet_address: walletAddress,
          transaction_hash: receipt.hash,
        }
      });

      if (duplicateError) {
        console.error("Error duplicating project:", duplicateError);
        toast({
          title: "Purchase Error",
          description: "Transaction completed but failed to create your copy",
          variant: "destructive",
        });
        return;
      }

      // Step 4: Record transaction
      const { error: txError } = await supabase.from("transactions").insert({
        listing_id: listing.id,
        buyer_wallet_address: walletAddress,
        seller_wallet_address: listing.seller_wallet_address,
        amount_pyusd: listing.price_pyusd,
        transaction_hash: receipt.hash,
        transaction_status: "completed",
        completed_at: new Date().toISOString(),
        project_id: duplicateResult.new_project_id,
      } as any);

      if (txError) {
        console.error("Error recording transaction:", txError);
      }

      // Step 5: Update listing status
      await supabase
        .from("nft_listings")
        .update({ listing_status: "sold", sold_at: new Date().toISOString() })
        .eq("id", listing.id);

      setStatus("success");
      toast({
        title: "Purchase Successful!",
        description: `You now own ${listing.projects.name}`,
      });

      setTimeout(() => {
        onSuccess();
        onOpenChange(false);
      }, 2000);
    } catch (error: any) {
      console.error("Purchase error:", error);
      setStatus("idle");
      toast({
        title: "Purchase Failed",
        description: error.message || "Transaction was rejected or failed",
        variant: "destructive",
      });
    }
  };

  const getBlockExplorerUrl = () => {
    if (!txHash || !chainId) return "";
    const explorers: Record<number, string> = {
      1: "https://etherscan.io",
      137: "https://polygonscan.com",
    };
    return `${explorers[chainId]}/tx/${txHash}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Purchase NFT</DialogTitle>
          <DialogDescription>
            Complete the transaction to purchase this research NFT
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Research Project:</span>
              <span className="font-medium">{listing.projects.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Token ID:</span>
              <span className="font-medium">#{listing.projects.nft_token_id}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Seller:</span>
              <span className="font-mono text-xs">
                {listing.seller_wallet_address.slice(0, 6)}...
                {listing.seller_wallet_address.slice(-4)}
              </span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t border-border">
              <span>Total Price:</span>
              <span className="text-primary">{listing.price_pyusd} PYUSD</span>
            </div>
          </div>

          {status === "success" && (
            <div className="flex items-center gap-2 p-4 bg-green-500/10 border border-green-500/20 rounded-md">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="text-sm text-green-500">Purchase completed successfully!</span>
            </div>
          )}

          {txHash && (
            <a
              href={getBlockExplorerUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-primary hover:underline"
            >
              View transaction
              <ExternalLink className="h-4 w-4" />
            </a>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={status !== "idle"}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePurchase}
              disabled={status !== "idle"}
              className="flex-1"
            >
              {status === "idle" && "Confirm Purchase"}
              {status === "approving" && (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Approving...
                </>
              )}
              {status === "purchasing" && (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Purchasing...
                </>
              )}
              {status === "success" && (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Success!
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
