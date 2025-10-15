const hre = require("hardhat");

async function main() {
  // Read the latest deployment file
  const fs = require("fs");
  const path = require("path");
  
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  const files = fs.readdirSync(deploymentsDir)
    .filter(f => f.startsWith(hre.network.name))
    .sort()
    .reverse();
  
  if (files.length === 0) {
    console.error("No deployment found for this network");
    process.exit(1);
  }
  
  const deploymentFile = path.join(deploymentsDir, files[0]);
  const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
  
  console.log("\n🔍 Verifying contracts on Etherscan...\n");
  console.log(`Network: ${deployment.network}`);
  console.log(`Deployment file: ${files[0]}\n`);

  try {
    // Verify MockPYUSD if deployed
    if (deployment.mockPYUSDDeployed) {
      console.log("Verifying MockPYUSD...");
      await hre.run("verify:verify", {
        address: deployment.contracts.PYUSD,
        constructorArguments: [],
      });
      console.log("✅ MockPYUSD verified\n");
    }

    // Verify ResearchNFT
    console.log("Verifying ResearchNFT...");
    await hre.run("verify:verify", {
      address: deployment.contracts.ResearchNFT,
      constructorArguments: [],
    });
    console.log("✅ ResearchNFT verified\n");

    // Verify ResearchMarketplace
    console.log("Verifying ResearchMarketplace...");
    await hre.run("verify:verify", {
      address: deployment.contracts.ResearchMarketplace,
      constructorArguments: [
        deployment.contracts.PYUSD,
        deployment.contracts.ResearchNFT,
        deployment.deployer, // fee recipient
      ],
    });
    console.log("✅ ResearchMarketplace verified\n");

    console.log("🎉 All contracts verified successfully!\n");
  } catch (error) {
    if (error.message.includes("Already Verified")) {
      console.log("ℹ️  Contracts are already verified\n");
    } else {
      console.error("❌ Verification failed:");
      console.error(error);
      process.exit(1);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

