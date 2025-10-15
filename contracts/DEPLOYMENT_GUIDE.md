# Smart Contract Deployment Guide

This guide explains how to deploy the Research NFT Marketplace smart contracts.

## Prerequisites

1. **Node.js and npm** - Install from [nodejs.org](https://nodejs.org/)
2. **Hardhat** - Ethereum development environment
3. **MetaMask** - Browser wallet extension
4. **Testnet ETH/MATIC** - For deploying to testnets

## Installation

```bash
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npm install @openzeppelin/contracts
```

## Setup Hardhat

1. Initialize Hardhat in the contracts directory:
```bash
cd contracts
npx hardhat init
```

2. Create `hardhat.config.js`:
```javascript
require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    // Ethereum Sepolia Testnet
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    // Polygon Mumbai Testnet
    mumbai: {
      url: process.env.MUMBAI_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    // Ethereum Mainnet
    mainnet: {
      url: process.env.MAINNET_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    // Polygon Mainnet
    polygon: {
      url: process.env.POLYGON_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    }
  }
};
```

3. Create `.env` file in contracts directory:
```
PRIVATE_KEY=your_wallet_private_key
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
MUMBAI_RPC_URL=https://polygon-mumbai.g.alchemy.com/v2/YOUR_KEY
MAINNET_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY
```

## Deployment Scripts

Create `scripts/deploy.js`:

```javascript
const hre = require("hardhat");

async function main() {
  // Get the contract factories
  const ResearchNFT = await hre.ethers.getContractFactory("ResearchNFT");
  const ResearchMarketplace = await hre.ethers.getContractFactory("ResearchMarketplace");

  console.log("Deploying ResearchNFT...");
  const researchNFT = await ResearchNFT.deploy();
  await researchNFT.waitForDeployment();
  const nftAddress = await researchNFT.getAddress();
  console.log("ResearchNFT deployed to:", nftAddress);

  // Get PYUSD address for the network
  const network = await hre.ethers.provider.getNetwork();
  let pyusdAddress;
  
  if (network.chainId === 1n) { // Ethereum Mainnet
    pyusdAddress = "0x6c3ea9036406852006290770BEdFcAbA0e23A0e8";
  } else if (network.chainId === 137n) { // Polygon
    pyusdAddress = "0x9aA8b6F4E8E1C74E68dF87C3F3DAe8Ac5FCA4Da1";
  } else {
    console.error("Unsupported network");
    return;
  }

  console.log("Deploying ResearchMarketplace...");
  const marketplace = await ResearchMarketplace.deploy(nftAddress, pyusdAddress);
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  console.log("ResearchMarketplace deployed to:", marketplaceAddress);

  console.log("\n=== Deployment Summary ===");
  console.log("ResearchNFT:", nftAddress);
  console.log("ResearchMarketplace:", marketplaceAddress);
  console.log("PYUSD Token:", pyusdAddress);
  console.log("\nUpdate these addresses in src/lib/contracts.ts");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

## Deploy to Network

### Testnet Deployment (Recommended First)

```bash
# Deploy to Ethereum Sepolia
npx hardhat run scripts/deploy.js --network sepolia

# Deploy to Polygon Mumbai
npx hardhat run scripts/deploy.js --network mumbai
```

### Mainnet Deployment

⚠️ **CAUTION**: Mainnet deployment uses real funds!

```bash
# Deploy to Ethereum Mainnet
npx hardhat run scripts/deploy.js --network mainnet

# Deploy to Polygon Mainnet
npx hardhat run scripts/deploy.js --network polygon
```

## Verify Contracts

After deployment, verify on block explorers:

```bash
# Verify on Etherscan
npx hardhat verify --network mainnet DEPLOYED_CONTRACT_ADDRESS

# Verify on Polygonscan
npx hardhat verify --network polygon DEPLOYED_CONTRACT_ADDRESS "CONSTRUCTOR_ARG1" "CONSTRUCTOR_ARG2"
```

## Update Frontend

After successful deployment, update `src/lib/contracts.ts` with the deployed addresses:

```typescript
export const CONTRACT_ADDRESSES = {
  1: { // Ethereum Mainnet
    RESEARCH_NFT: "0xYOUR_NFT_ADDRESS",
    MARKETPLACE: "0xYOUR_MARKETPLACE_ADDRESS",
    PYUSD: "0x6c3ea9036406852006290770BEdFcAbA0e23A0e8",
  },
  137: { // Polygon
    RESEARCH_NFT: "0xYOUR_NFT_ADDRESS",
    MARKETPLACE: "0xYOUR_MARKETPLACE_ADDRESS",
    PYUSD: "0x9aA8b6F4E8E1C74E68dF87C3F3DAe8Ac5FCA4Da1",
  },
};
```

## Testing

Create `test/ResearchNFT.test.js`:

```javascript
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ResearchNFT", function () {
  let researchNFT;
  let owner, addr1;

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();
    const ResearchNFT = await ethers.getContractFactory("ResearchNFT");
    researchNFT = await ResearchNFT.deploy();
  });

  it("Should mint NFT with correct data", async function () {
    const metadataURI = "ipfs://QmTest";
    const projectCID = "QmProject";
    
    await researchNFT.mintResearchNFT(
      addr1.address,
      metadataURI,
      projectCID,
      owner.address,
      500 // 5% royalty
    );

    expect(await researchNFT.ownerOf(1)).to.equal(addr1.address);
    expect(await researchNFT.getProjectCID(1)).to.equal(projectCID);
  });
});
```

Run tests:
```bash
npx hardhat test
```

## Security Considerations

1. **Private Keys**: Never commit private keys to git
2. **Audit**: Get contracts audited before mainnet deployment
3. **Testing**: Thoroughly test on testnets first
4. **Gas Optimization**: Review gas costs before deployment
5. **Access Control**: Verify ownership and permissions
6. **Upgradability**: Consider using upgradeable proxy patterns for future updates

## Troubleshooting

### Common Issues

1. **Insufficient funds**: Ensure your wallet has enough ETH/MATIC for deployment
2. **Nonce too low**: Clear your wallet's pending transactions
3. **Gas estimation failed**: Check contract code for errors
4. **Network timeout**: Use a reliable RPC provider like Alchemy or Infura

### Getting Help

- [Hardhat Documentation](https://hardhat.org/docs)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts)
- [Ethereum Stack Exchange](https://ethereum.stackexchange.com/)

## Next Steps

1. Deploy contracts to testnet
2. Test all functionality in the frontend
3. Audit contracts
4. Deploy to mainnet
5. Update frontend configuration
6. Monitor contract activity
