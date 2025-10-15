// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ResearchMarketplace
 * @dev Marketplace for buying/selling research NFTs using PYUSD
 */
contract ResearchMarketplace is ReentrancyGuard, Ownable {
    IERC20 public pyusdToken;
    IERC721 public researchNFT;

    struct Listing {
        uint256 tokenId;
        address seller;
        uint256 price; // Price in PYUSD (6 decimals)
        bool active;
    }

    // Mapping from token ID to listing
    mapping(uint256 => Listing) public listings;

    // Platform fee (in basis points, e.g., 250 = 2.5%)
    uint256 public platformFee = 250;
    address public feeRecipient;

    // Events
    event NFTListed(
        uint256 indexed tokenId,
        address indexed seller,
        uint256 price
    );

    event NFTDelisted(
        uint256 indexed tokenId,
        address indexed seller
    );

    event NFTPurchased(
        uint256 indexed tokenId,
        address indexed buyer,
        address indexed seller,
        uint256 price
    );

    event PriceUpdated(
        uint256 indexed tokenId,
        uint256 oldPrice,
        uint256 newPrice
    );

    constructor(
        address _pyusdToken,
        address _researchNFT,
        address _feeRecipient
    ) Ownable(msg.sender) {
        pyusdToken = IERC20(_pyusdToken);
        researchNFT = IERC721(_researchNFT);
        feeRecipient = _feeRecipient;
    }

    /**
     * @dev List an NFT for sale
     */
    function listNFT(uint256 tokenId, uint256 price) external {
        require(price > 0, "Price must be greater than 0");
        require(researchNFT.ownerOf(tokenId) == msg.sender, "Not the owner");
        require(
            researchNFT.getApproved(tokenId) == address(this) ||
            researchNFT.isApprovedForAll(msg.sender, address(this)),
            "Marketplace not approved"
        );

        listings[tokenId] = Listing({
            tokenId: tokenId,
            seller: msg.sender,
            price: price,
            active: true
        });

        emit NFTListed(tokenId, msg.sender, price);
    }

    /**
     * @dev Delist an NFT
     */
    function delistNFT(uint256 tokenId) external {
        Listing storage listing = listings[tokenId];
        require(listing.active, "NFT not listed");
        require(listing.seller == msg.sender, "Not the seller");

        listing.active = false;

        emit NFTDelisted(tokenId, msg.sender);
    }

    /**
     * @dev Update the price of a listed NFT
     */
    function updatePrice(uint256 tokenId, uint256 newPrice) external {
        Listing storage listing = listings[tokenId];
        require(listing.active, "NFT not listed");
        require(listing.seller == msg.sender, "Not the seller");
        require(newPrice > 0, "Price must be greater than 0");

        uint256 oldPrice = listing.price;
        listing.price = newPrice;

        emit PriceUpdated(tokenId, oldPrice, newPrice);
    }

    /**
     * @dev Purchase an NFT with PYUSD
     */
    function purchaseNFT(uint256 tokenId) external nonReentrant {
        Listing storage listing = listings[tokenId];
        require(listing.active, "NFT not listed");
        require(msg.sender != listing.seller, "Cannot buy your own NFT");

        address seller = listing.seller;
        uint256 price = listing.price;

        // Calculate fees
        uint256 fee = (price * platformFee) / 10000;
        uint256 sellerAmount = price - fee;

        // Transfer PYUSD from buyer to seller and fee recipient
        require(
            pyusdToken.transferFrom(msg.sender, seller, sellerAmount),
            "Transfer to seller failed"
        );
        require(
            pyusdToken.transferFrom(msg.sender, feeRecipient, fee),
            "Transfer fee failed"
        );

        // Transfer NFT to buyer
        researchNFT.safeTransferFrom(seller, msg.sender, tokenId);

        // Mark listing as inactive
        listing.active = false;

        emit NFTPurchased(tokenId, msg.sender, seller, price);
    }

    /**
     * @dev Update platform fee (only owner)
     */
    function updatePlatformFee(uint256 newFee) external onlyOwner {
        require(newFee <= 1000, "Fee too high"); // Max 10%
        platformFee = newFee;
    }

    /**
     * @dev Update fee recipient (only owner)
     */
    function updateFeeRecipient(address newRecipient) external onlyOwner {
        require(newRecipient != address(0), "Invalid address");
        feeRecipient = newRecipient;
    }

    /**
     * @dev Get listing details
     */
    function getListing(uint256 tokenId) external view returns (Listing memory) {
        return listings[tokenId];
    }
}
