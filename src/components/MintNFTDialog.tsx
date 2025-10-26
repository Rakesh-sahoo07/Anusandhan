import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Coins } from "lucide-react";
import { ethers } from "ethers";
import { useWeb3 } from "@/contexts/Web3Context";
import { RESEARCH_NFT_ABI, MARKETPLACE_ABI, ERC20_ABI, getContractAddress } from "@/lib/contracts";

interface MintNFTDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
  metadataCid: string;
  dataCid: string;
}

export const MintNFTDialog = ({ open, onOpenChange, projectId, projectName, metadataCid, dataCid }: MintNFTDialogProps) => {
  const { walletAddress, chainId } = useWeb3();
  const [royaltyPercentage, setRoyaltyPercentage] = useState("5");
  const [listingPrice, setListingPrice] = useState("");
  const [isMinting, setIsMinting] = useState(false);
  const [mintStep, setMintStep] = useState<string>("");

  const handleMint = async () => {
    if (!walletAddress || !chainId) {
      toast({
        title: "Error",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }

    if (!window.ethereum) {
      toast({
        title: "Error",
        description: "MetaMask not found",
        variant: "destructive",
      });
      return;
    }

    if (!metadataCid || !dataCid) {
      toast({
        title: "Error",
        description: "Project must be saved with valid metadata before minting",
        variant: "destructive",
      });
      return;
    }

    const royaltyBps = Math.floor(parseFloat(royaltyPercentage) * 100); // Convert to basis points
    if (royaltyBps < 0 || royaltyBps > 1000) {
      toast({
        title: "Error",
        description: "Royalty percentage must be between 0% and 10%",
        variant: "destructive",
      });
      return;
    }

    setIsMinting(true);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Get contract addresses
      const nftAddress = getContractAddress(chainId, 'RESEARCH_NFT');
      const marketplaceAddress = getContractAddress(chainId, 'MARKETPLACE');

      if (nftAddress === "0x0000000000000000000000000000000000000000") {
        throw new Error("NFT contract not deployed on this network. Please deploy the contracts first.");
      }

      // Step 1: Mint NFT
      setMintStep("Minting NFT...");
      const nftContract = new ethers.Contract(nftAddress, RESEARCH_NFT_ABI, signer);
      const metadataUri = `ipfs://${metadataCid}`;

      const mintTx = await nftContract.mintResearchNFT(
        walletAddress,
        metadataUri,
        dataCid,
        walletAddress, // Royalty receiver
        royaltyBps
      );

      setMintStep("Waiting for confirmation...");
      const mintReceipt = await mintTx.wait();
      
      // Extract token ID from event
      const mintEvent = mintReceipt.logs.find((log: any) => {
        try {
          const parsed = nftContract.interface.parseLog(log);
          return parsed?.name === "NFTMinted";
        } catch {
          return false;
        }
      });

      if (!mintEvent) throw new Error("Failed to find mint event");
      const parsedEvent = nftContract.interface.parseLog(mintEvent);
      const tokenId = parsedEvent?.args?.tokenId.toString();

      console.log("NFT minted:", { tokenId, txHash: mintReceipt.hash });

      // Step 2: Update database
      setMintStep("Updating database...");
      const { error: dbError } = await supabase.functions.invoke('mint-nft', {
        body: {
          projectId,
          transactionHash: mintReceipt.hash,
          tokenId,
          contractAddress: nftAddress,
          chainId,
        },
      });

      if (dbError) throw dbError;

      // Step 3: List on marketplace if price provided
      if (listingPrice && parseFloat(listingPrice) > 0) {
        setMintStep("Approving marketplace...");
        
        // Check if marketplace is already approved
        const isApproved = await nftContract.isApprovedForAll(walletAddress, marketplaceAddress);
        if (!isApproved) {
          // Approve marketplace to transfer ALL NFTs (more efficient than single approval)
          const approveTx = await nftContract.setApprovalForAll(marketplaceAddress, true);
          await approveTx.wait();
        }

        setMintStep("Listing on marketplace...");
        const marketplaceContract = new ethers.Contract(marketplaceAddress, MARKETPLACE_ABI, signer);
        const priceInPyusd = ethers.parseUnits(listingPrice, 6); // PYUSD has 6 decimals

        const listTx = await marketplaceContract.listNFT(tokenId, priceInPyusd);
        const listReceipt = await listTx.wait();

        // Update database with listing
        await supabase.functions.invoke('create-listing', {
          body: {
            projectId,
            price: listingPrice,
            sellerAddress: walletAddress,
            transactionHash: listReceipt.hash,
          },
        });
      }

      toast({
        title: "Success!",
        description: (
          <div className="space-y-1">
            <p>NFT minted successfully!</p>
            <p className="text-xs text-muted-foreground">Token ID: {tokenId}</p>
          </div>
        ),
      });

      onOpenChange(false);
      
    } catch (error: any) {
      console.error("Error minting NFT:", error);
      toast({
        title: "Minting Failed",
        description: error.message || "Failed to mint NFT",
        variant: "destructive",
      });
    } finally {
      setIsMinting(false);
      setMintStep("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Mint as NFT</DialogTitle>
          <DialogDescription>
            Mint "{projectName}" as an NFT on the blockchain
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="royalty">Royalty Percentage (0-10%)</Label>
            <Input
              id="royalty"
              type="number"
              min="0"
              max="10"
              step="0.5"
              value={royaltyPercentage}
              onChange={(e) => setRoyaltyPercentage(e.target.value)}
              disabled={isMinting}
            />
            <p className="text-xs text-muted-foreground">
              You'll receive this percentage of future sales
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="price">List Price (PYUSD) - Optional</Label>
            <Input
              id="price"
              type="number"
              min="0"
              step="0.01"
              placeholder="Leave empty to mint without listing"
              value={listingPrice}
              onChange={(e) => setListingPrice(e.target.value)}
              disabled={isMinting}
            />
            <p className="text-xs text-muted-foreground">
              List immediately on the marketplace after minting
            </p>
          </div>

          <div className="rounded-md bg-muted p-3 text-sm space-y-1">
            <p><strong>Metadata CID:</strong> {metadataCid ? `${metadataCid.slice(0, 20)}...` : 'Not available'}</p>
            <p><strong>Data CID:</strong> {dataCid ? `${dataCid.slice(0, 20)}...` : 'Not available'}</p>
            <p className="text-muted-foreground text-xs">
              ⛽ Requires gas fee for blockchain transaction
            </p>
          </div>

          {mintStep && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {mintStep}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isMinting}>
            Cancel
          </Button>
          <Button onClick={handleMint} disabled={isMinting}>
            {isMinting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Minting...
              </>
            ) : (
              <>
                <Coins className="mr-2 h-4 w-4" />
                Mint NFT
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
