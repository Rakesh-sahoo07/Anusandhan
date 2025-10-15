/**
 * Smart contract addresses and ABIs
 * 
 * IMPORTANT: Update these addresses after deploying the contracts to your chosen network
 */

// Contract addresses - UPDATE THESE AFTER DEPLOYMENT
export const CONTRACT_ADDRESSES = {
  // Ethereum Mainnet
  1: {
    RESEARCH_NFT: "0x0000000000000000000000000000000000000000", // TODO: Deploy and update
    MARKETPLACE: "0x0000000000000000000000000000000000000000", // TODO: Deploy and update
    PYUSD: "0x6c3ea9036406852006290770BEdFcAbA0e23A0e8", // PYUSD on Ethereum
  },
  // Polygon
  137: {
    RESEARCH_NFT: "0x0000000000000000000000000000000000000000", // TODO: Deploy and update
    MARKETPLACE: "0x0000000000000000000000000000000000000000", // TODO: Deploy and update
    PYUSD: "0x9aA8b6F4E8E1C74E68dF87C3F3DAe8Ac5FCA4Da1", // PYUSD on Polygon
  },
};

// Simplified ABIs for contract interaction
export const RESEARCH_NFT_ABI = [
  "function mintResearchNFT(address to, string memory metadataURI, string memory projectCID, address royaltyReceiver, uint96 royaltyPercentage) external returns (uint256)",
  "function getProjectCID(uint256 tokenId) external view returns (string memory)",
  "function getCreator(uint256 tokenId) external view returns (address)",
  "function isMinted(string memory projectCID) external view returns (bool)",
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function tokenURI(uint256 tokenId) external view returns (string memory)",
  "function setApprovalForAll(address operator, bool approved) external",
  "function isApprovedForAll(address owner, address operator) external view returns (bool)",
  "event NFTMinted(uint256 indexed tokenId, address indexed creator, address indexed owner, string cid, string metadataURI)",
];

export const MARKETPLACE_ABI = [
  "function listNFT(uint256 tokenId, uint256 price) external",
  "function delistNFT(uint256 tokenId) external",
  "function updatePrice(uint256 tokenId, uint256 newPrice) external",
  "function purchaseNFT(uint256 tokenId) external",
  "function getListing(uint256 tokenId) external view returns (tuple(uint256 tokenId, address seller, uint256 price, bool active))",
  "event NFTListed(uint256 indexed tokenId, address indexed seller, uint256 price)",
  "event NFTDelisted(uint256 indexed tokenId, address indexed seller)",
  "event NFTPurchased(uint256 indexed tokenId, address indexed buyer, address indexed seller, uint256 price)",
  "event PriceUpdated(uint256 indexed tokenId, uint256 oldPrice, uint256 newPrice)",
];

export const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
];

export const getContractAddress = (chainId: number, contractName: keyof typeof CONTRACT_ADDRESSES[1]) => {
  const addresses = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES];
  if (!addresses) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }
  return addresses[contractName];
};
