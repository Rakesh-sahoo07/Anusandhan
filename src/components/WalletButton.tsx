import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWeb3 } from "@/contexts/Web3Context";
import { Wallet, Copy, LogOut, Network, Loader2, User, FolderKanban } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const NETWORK_NAMES: Record<number, string> = {
  1: "Ethereum",
  137: "Polygon",
};

export const WalletButton = () => {
  const {
    walletAddress,
    isConnecting,
    chainId,
    ethBalance,
    pyusdBalance,
    connectWallet,
    disconnectWallet,
    switchNetwork,
  } = useWeb3();
  const navigate = useNavigate();

  const copyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      toast({
        title: "Address Copied",
        description: "Wallet address copied to clipboard",
      });
    }
  };

  if (!walletAddress) {
    return (
      <Button
        onClick={connectWallet}
        disabled={isConnecting}
        className="gap-2 bg-white text-black hover:bg-white/90"
      >
        {isConnecting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Connecting...
          </>
        ) : (
          <>
            <Wallet className="h-4 w-4" />
            Connect Wallet
          </>
        )}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="gap-2 bg-white text-black hover:bg-white/90">
          <Wallet className="h-4 w-4" />
          {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Wallet Info</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <div className="px-2 py-1.5 text-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-muted-foreground">Network:</span>
            <span className="font-medium">{chainId ? NETWORK_NAMES[chainId] || `Chain ${chainId}` : "Unknown"}</span>
          </div>
          {ethBalance && (
            <div className="flex items-center justify-between mb-1">
              <span className="text-muted-foreground">ETH:</span>
              <span className="font-medium">{parseFloat(ethBalance).toFixed(4)}</span>
            </div>
          )}
          {pyusdBalance && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">PYUSD:</span>
              <span className="font-medium">{parseFloat(pyusdBalance).toFixed(2)}</span>
            </div>
          )}
        </div>

        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={() => navigate(`/profile/${walletAddress}`)} className="gap-2">
          <User className="h-4 w-4" />
          View Profile
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => navigate('/projects')} className="gap-2">
          <FolderKanban className="h-4 w-4" />
          My Projects
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => navigate(`/transactions`)} className="gap-2">
          <Network className="h-4 w-4" />
          Transaction History
        </DropdownMenuItem>

        <DropdownMenuItem onClick={copyAddress} className="gap-2">
          <Copy className="h-4 w-4" />
          Copy Address
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => switchNetwork(1)} className="gap-2">
          <Network className="h-4 w-4" />
          Switch to Ethereum
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => switchNetwork(137)} className="gap-2">
          <Network className="h-4 w-4" />
          Switch to Polygon
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={disconnectWallet} className="gap-2 text-destructive">
          <LogOut className="h-4 w-4" />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
