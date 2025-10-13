# Research NFT Smart Contracts

This directory contains the Solidity smart contracts for the Research NFT marketplace.

## Contracts

### ResearchNFT.sol
ERC-721 NFT contract for research projects with the following features:
- Unique NFTs for each research project
- EIP-2981 royalty support (up to 10%)
- Stores project CID and creator information
- Prevents duplicate minting of the same project

### ResearchMarketplace.sol
Marketplace contract for buying/selling research NFTs:
- List/delist NFTs with PYUSD pricing
- Purchase NFTs with PYUSD
- Update listing prices
- Platform fee mechanism (default 2.5%)
- Non-reentrant secure transactions

## Deployment Instructions

### Prerequisites
1. Install Hardhat or Foundry for contract deployment
2. Get PYUSD token addresses for your target networks:
   - Ethereum Mainnet: `0x6c3ea9036406852006290770BEdFcAbA0e23A0e8`
   - Polygon: `0x9aA8b6F4E8E1C74E68dF87C3F3DAe8Ac5FCA4Da1`

### Deployment Steps

1. **Deploy ResearchNFT contract:**
   ```bash
   # No constructor arguments needed
   ```

2. **Deploy ResearchMarketplace contract:**
   ```bash
   # Constructor arguments:
   # - PYUSD token address
   # - ResearchNFT contract address
   # - Fee recipient address
   ```

3. **Update contract addresses in the app:**
   After deployment, update the addresses in `src/lib/contracts.ts`:
   ```typescript
   export const CONTRACT_ADDRESSES = {
     1: {
       RESEARCH_NFT: "0xYourDeployedNFTAddress",
       MARKETPLACE: "0xYourDeployedMarketplaceAddress",
       PYUSD: "0x6c3ea9036406852006290770BEdFcAbA0e23A0e8",
     },
     // ... same for other networks
   };
   ```

## Dependencies

The contracts use OpenZeppelin libraries:
- `@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol`
- `@openzeppelin/contracts/token/common/ERC2981.sol`
- `@openzeppelin/contracts/token/ERC20/IERC20.sol`
- `@openzeppelin/contracts/access/Ownable.sol`
- `@openzeppelin/contracts/security/ReentrancyGuard.sol`
- `@openzeppelin/contracts/utils/Counters.sol`

Install with:
```bash
npm install @openzeppelin/contracts
```

## Testing

Before deployment, test the contracts thoroughly:
1. Unit tests for each function
2. Integration tests for the full flow (mint → list → purchase)
3. Security audits for production use

## Gas Optimization

Consider these gas-saving strategies:
- Batch minting operations when possible
- Use events for off-chain indexing instead of on-chain storage
- Optimize struct packing in the marketplace
- Consider EIP-2309 for batch transfers

## Security Considerations

- ✅ ReentrancyGuard on purchase functions
- ✅ Proper access control with Ownable
- ✅ Input validation on all external functions
- ✅ EIP-2981 royalty enforcement
- ⚠️ Recommend security audit before mainnet deployment
