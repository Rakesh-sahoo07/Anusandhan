const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("\n🚀 Starting deployment process...\n");

  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();
  const network = await hre.ethers.provider.getNetwork();
  const chainId = Number(network.chainId);

  console.log("📋 Deployment Details:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`Network: ${hre.network.name} (Chain ID: ${chainId})`);
  console.log(`Deployer: ${deployer.address}`);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`Balance: ${hre.ethers.formatEther(balance)} ETH`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Get PYUSD address for the network
  let pyusdAddress;
  let deployedMockPYUSD = false;

  if (chainId === 11155111) { // Sepolia
    pyusdAddress = "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9";
    console.log(`📍 Using Sepolia PYUSD: ${pyusdAddress}\n`);
  } else if (chainId === 1) { // Ethereum Mainnet
    pyusdAddress = "0x6c3ea9036406852006290770BEdFcAbA0e23A0e8";
    console.log(`📍 Using Mainnet PYUSD: ${pyusdAddress}\n`);
  } else if (chainId === 137) { // Polygon
    pyusdAddress = "0x9aA8b6F4E8E1C74E68dF87C3F3DAe8Ac5FCA4Da1";
    console.log(`📍 Using Polygon PYUSD: ${pyusdAddress}\n`);
  } else if (chainId === 80001) { // Mumbai - deploy MockPYUSD
    console.log("📍 Detected Mumbai testnet - deploying MockPYUSD...");
    const MockPYUSD = await hre.ethers.getContractFactory("MockPYUSD");
    const mockPYUSD = await MockPYUSD.deploy();
    await mockPYUSD.waitForDeployment();
    pyusdAddress = await mockPYUSD.getAddress();
    deployedMockPYUSD = true;
    console.log(`✅ MockPYUSD deployed to: ${pyusdAddress}\n`);
  } else {
    throw new Error(`Unsupported network with chain ID: ${chainId}`);
  }

  // Deploy ResearchNFT
  console.log("🎨 Deploying ResearchNFT contract...");
  const ResearchNFT = await hre.ethers.getContractFactory("ResearchNFT");
  const researchNFT = await ResearchNFT.deploy();
  await researchNFT.waitForDeployment();
  const nftAddress = await researchNFT.getAddress();
  console.log(`✅ ResearchNFT deployed to: ${nftAddress}\n`);

  // Get fee recipient address from env or use deployer
  const feeRecipient = process.env.FEE_RECIPIENT_ADDRESS || deployer.address;
  
  // Deploy ResearchMarketplace
  console.log("🏪 Deploying ResearchMarketplace contract...");
  console.log(`   PYUSD Token: ${pyusdAddress}`);
  console.log(`   NFT Contract: ${nftAddress}`);
  console.log(`   Fee Recipient: ${feeRecipient}`);
  
  const ResearchMarketplace = await hre.ethers.getContractFactory("ResearchMarketplace");
  const marketplace = await ResearchMarketplace.deploy(pyusdAddress, nftAddress, feeRecipient);
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  console.log(`✅ ResearchMarketplace deployed to: ${marketplaceAddress}\n`);

  // Deployment Summary
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📊 DEPLOYMENT SUMMARY");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`ResearchNFT:         ${nftAddress}`);
  console.log(`ResearchMarketplace: ${marketplaceAddress}`);
  console.log(`PYUSD Token:         ${pyusdAddress}`);
  if (deployedMockPYUSD) {
    console.log(`(MockPYUSD deployed)`);
  }
  console.log(`Fee Recipient:       ${feeRecipient}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Save deployment addresses to file
  const deploymentInfo = {
    network: hre.network.name,
    chainId: chainId,
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      ResearchNFT: nftAddress,
      ResearchMarketplace: marketplaceAddress,
      PYUSD: pyusdAddress,
    },
    mockPYUSDDeployed: deployedMockPYUSD,
  };

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }

  const filename = `${hre.network.name}-${Date.now()}.json`;
  const filepath = path.join(deploymentsDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`💾 Deployment info saved to: ${filepath}\n`);

  // Generate frontend configuration
  console.log("📝 Frontend Configuration:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Update src/lib/contracts.ts with:\n");
  console.log(`  ${chainId}: {`);
  console.log(`    RESEARCH_NFT: "${nftAddress}",`);
  console.log(`    MARKETPLACE: "${marketplaceAddress}",`);
  console.log(`    PYUSD: "${pyusdAddress}",`);
  console.log(`  },\n`);

  // Verification instructions
  if (hre.network.name !== "localhost" && hre.network.name !== "hardhat") {
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🔍 VERIFICATION COMMANDS");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\nWait a few minutes for Etherscan to index, then run:\n");
    
    if (deployedMockPYUSD) {
      console.log(`npx hardhat verify --network ${hre.network.name} ${pyusdAddress}`);
    }
    console.log(`npx hardhat verify --network ${hre.network.name} ${nftAddress}`);
    console.log(`npx hardhat verify --network ${hre.network.name} ${marketplaceAddress} "${pyusdAddress}" "${nftAddress}" "${feeRecipient}"`);
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  }

  // Additional setup for testnets
  if (chainId === 11155111) {
    console.log("💡 SEPOLIA TESTNET SETUP:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("To get test PYUSD on Sepolia:");
    console.log("1. Visit Circle's PYUSD faucet (if available)");
    console.log("2. Or swap testnet ETH for PYUSD on Uniswap Sepolia");
    console.log(`3. PYUSD Contract: ${pyusdAddress}`);
    console.log(`4. View on Etherscan: https://sepolia.etherscan.io/address/${pyusdAddress}\n`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  } else if (deployedMockPYUSD) {
    console.log("💡 TESTNET SETUP:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("To get test PYUSD, call the faucet function:");
    console.log(`\nconst mockPYUSD = await hre.ethers.getContractAt("MockPYUSD", "${pyusdAddress}");`);
    console.log(`await mockPYUSD.faucet(); // Mints 1000 PYUSD to your address\n`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  }

  console.log("✨ Deployment completed successfully!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });

