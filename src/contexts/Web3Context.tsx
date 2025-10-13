import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { ethers } from "ethers";
import { toast } from "@/hooks/use-toast";

interface Web3ContextType {
  walletAddress: string | null;
  isConnecting: boolean;
  chainId: number | null;
  ethBalance: string | null;
  pyusdBalance: string | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  switchNetwork: (targetChainId: number) => Promise<void>;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

// PYUSD token addresses on different networks
const PYUSD_ADDRESSES: Record<number, string> = {
  1: "0x6c3ea9036406852006290770BEdFcAbA0e23A0e8", // Ethereum Mainnet
  137: "0x9aA8b6F4E8E1C74E68dF87C3F3DAe8Ac5FCA4Da1", // Polygon
};

// Network configurations
const NETWORKS: Record<number, { name: string; rpcUrl: string }> = {
  1: { name: "Ethereum", rpcUrl: "https://eth.llamarpc.com" },
  137: { name: "Polygon", rpcUrl: "https://polygon-rpc.com" },
};

export const Web3Provider = ({ children }: { children: ReactNode }) => {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [chainId, setChainId] = useState<number | null>(null);
  const [ethBalance, setEthBalance] = useState<string | null>(null);
  const [pyusdBalance, setPyusdBalance] = useState<string | null>(null);

  const fetchBalances = async (address: string, provider: ethers.BrowserProvider) => {
    try {
      // Fetch ETH balance
      const balance = await provider.getBalance(address);
      setEthBalance(ethers.formatEther(balance));

      // Fetch PYUSD balance if supported on current network
      const network = await provider.getNetwork();
      const currentChainId = Number(network.chainId);
      
      if (PYUSD_ADDRESSES[currentChainId]) {
        const pyusdContract = new ethers.Contract(
          PYUSD_ADDRESSES[currentChainId],
          ["function balanceOf(address) view returns (uint256)"],
          provider
        );
        const pyusdBal = await pyusdContract.balanceOf(address);
        setPyusdBalance(ethers.formatUnits(pyusdBal, 6)); // PYUSD has 6 decimals
      } else {
        setPyusdBalance(null);
      }
    } catch (error) {
      console.error("Error fetching balances:", error);
    }
  };

  const connectWallet = async () => {
    if (typeof window.ethereum === "undefined") {
      toast({
        title: "Wallet Not Found",
        description: "Please install MetaMask or another Web3 wallet",
        variant: "destructive",
      });
      return;
    }

    setIsConnecting(true);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const address = accounts[0];
      
      setWalletAddress(address);

      const network = await provider.getNetwork();
      setChainId(Number(network.chainId));

      await fetchBalances(address, provider);

      toast({
        title: "Wallet Connected",
        description: `Connected to ${address.slice(0, 6)}...${address.slice(-4)}`,
      });
    } catch (error: any) {
      console.error("Error connecting wallet:", error);
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect wallet",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setWalletAddress(null);
    setChainId(null);
    setEthBalance(null);
    setPyusdBalance(null);
    toast({
      title: "Wallet Disconnected",
      description: "Your wallet has been disconnected",
    });
  };

  const switchNetwork = async (targetChainId: number) => {
    if (!window.ethereum) return;

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${targetChainId.toString(16)}` }],
      });
    } catch (error: any) {
      // If network doesn't exist, add it
      if (error.code === 4902) {
        const networkConfig = NETWORKS[targetChainId];
        if (networkConfig) {
          try {
            await window.ethereum.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: `0x${targetChainId.toString(16)}`,
                  chainName: networkConfig.name,
                  rpcUrls: [networkConfig.rpcUrl],
                },
              ],
            });
          } catch (addError) {
            console.error("Error adding network:", addError);
            toast({
              title: "Failed to Add Network",
              description: "Could not add the network to your wallet",
              variant: "destructive",
            });
          }
        }
      } else {
        console.error("Error switching network:", error);
        toast({
          title: "Network Switch Failed",
          description: error.message || "Failed to switch network",
          variant: "destructive",
        });
      }
    }
  };

  // Listen for account changes
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else {
        setWalletAddress(accounts[0]);
        if (accounts[0]) {
          const provider = new ethers.BrowserProvider(window.ethereum);
          fetchBalances(accounts[0], provider);
        }
      }
    };

    const handleChainChanged = (chainIdHex: string) => {
      const newChainId = parseInt(chainIdHex, 16);
      setChainId(newChainId);
      if (walletAddress) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        fetchBalances(walletAddress, provider);
      }
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, [walletAddress]);

  // Check if wallet is already connected on mount
  useEffect(() => {
    if (!window.ethereum) return;

    const checkConnection = async () => {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send("eth_accounts", []);
        
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          const network = await provider.getNetwork();
          setChainId(Number(network.chainId));
          await fetchBalances(accounts[0], provider);
        }
      } catch (error) {
        console.error("Error checking wallet connection:", error);
      }
    };

    checkConnection();
  }, []);

  return (
    <Web3Context.Provider
      value={{
        walletAddress,
        isConnecting,
        chainId,
        ethBalance,
        pyusdBalance,
        connectWallet,
        disconnectWallet,
        switchNetwork,
      }}
    >
      {children}
    </Web3Context.Provider>
  );
};

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error("useWeb3 must be used within Web3Provider");
  }
  return context;
};
