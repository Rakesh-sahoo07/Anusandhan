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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWeb3 } from "@/contexts/Web3Context";
import { toast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getContractAddress, MARKETPLACE_ABI, RESEARCH_NFT_ABI, ERC20_ABI } from "@/lib/contracts";

interface ListNFTDialogProps {
  project: {
    id: string;
    name: string;
    nft_token_id: string;
    nft_contract_address: string;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ListNFTDialog({ project, open, onOpenChange, onSuccess }: ListNFTDialogProps) {
  const [price, setPrice] = useState("");
  const [status, setStatus] = useState<"idle" | "approving" | "listing" | "success">("idle");
  const [txHash, setTxHash] = useState<string>("");
  const { walletAddress, chainId } = useWeb3();

  const handleList = async () => {
    if (!walletAddress || !chainId || !price) {
      toast({
        title: "Invalid input",
        description: "Please enter a valid price and connect your wallet",
        variant: "destructive",
      });
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      toast({
        title: "Invalid price",
        description: "Please enter a valid price greater than 0",
        variant: "destructive",
      });
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const marketplaceAddress = getContractAddress(chainId, "MARKETPLACE");
      const nftAddress = getContractAddress(chainId, "RESEARCH_NFT");
      
      const marketplace = new ethers.Contract(marketplaceAddress, MARKETPLACE_ABI, signer);
      const nft = new ethers.Contract(nftAddress, RESEARCH_NFT_ABI, signer);

      // Step 1: Approve marketplace to transfer NFT
      setStatus("approving");
      toast({
        title: "Approval Required",
        description: "Please approve the marketplace to list your NFT",
      });

      const isApproved = await nft.isApprovedForAll(walletAddress, marketplaceAddress);
      if (!isApproved) {
        const approveTx = await nft.setApprovalForAll(marketplaceAddress, true);
        await approveTx.wait();
      }

      // Step 2: List NFT on marketplace
      setStatus("listing");
      toast({
        title: "Listing NFT",
        description: "Please confirm the listing transaction",
      });

      const priceInWei = ethers.parseUnits(price, 6); // PYUSD has 6 decimals
      const listTx = await marketplace.listNFT(project.nft_token_id, priceInWei);
      const receipt = await listTx.wait();
      setTxHash(receipt.hash);

      // Step 3: Create listing in database
      const { error } = await supabase.functions.invoke("create-listing", {
        body: {
          projectId: project.id,
          price: priceNum,
          sellerAddress: walletAddress,
          transactionHash: receipt.hash,
        },
      });

      if (error) {
        console.error("Error creating listing:", error);
        throw error;
      }

      setStatus("success");
      toast({
        title: "NFT Listed Successfully!",
        description: `${project.name} is now listed on the marketplace`,
      });

      setTimeout(() => {
        onSuccess();
        onOpenChange(false);
      }, 2000);
    } catch (error: any) {
      console.error("Listing error:", error);
      setStatus("idle");
      toast({
        title: "Listing Failed",
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
          <DialogTitle>List NFT on Marketplace</DialogTitle>
          <DialogDescription>
            Set a price and list your research NFT for sale
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Project:</span>
              <span className="font-medium">{project.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Token ID:</span>
              <span className="font-medium">#{project.nft_token_id}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Price (PYUSD)</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              min="0"
              placeholder="Enter price in PYUSD"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              disabled={status !== "idle"}
            />
            <p className="text-xs text-muted-foreground">
              Set the price for your NFT in PYUSD stablecoin
            </p>
          </div>

          {status === "success" && (
            <div className="flex items-center gap-2 p-4 bg-green-500/10 border border-green-500/20 rounded-md">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="text-sm text-green-500">NFT listed successfully!</span>
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
              onClick={handleList}
              disabled={status !== "idle" || !price}
              className="flex-1"
            >
              {status === "idle" && "List NFT"}
              {status === "approving" && (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Approving...
                </>
              )}
              {status === "listing" && (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Listing...
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
