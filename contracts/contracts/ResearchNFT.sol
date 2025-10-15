// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ResearchNFT
 * @dev ERC-721 NFT contract for research projects with royalty support (EIP-2981)
 */
contract ResearchNFT is ERC721URIStorage, ERC2981, Ownable {
    uint256 private _tokenIdCounter;

    // Mapping from token ID to project CID
    mapping(uint256 => string) public tokenToCID;
    
    // Mapping from token ID to creator address
    mapping(uint256 => address) public tokenToCreator;
    
    // Mapping from CID to token ID (prevent duplicate minting)
    mapping(string => uint256) public cidToToken;

    // Events
    event NFTMinted(
        uint256 indexed tokenId,
        address indexed creator,
        address indexed owner,
        string cid,
        string metadataURI
    );

    constructor() ERC721("Research Project NFT", "RPNFT") Ownable(msg.sender) {}

    /**
     * @dev Mint a new NFT for a research project
     * @param to Address to mint the NFT to
     * @param metadataURI URI pointing to NFT metadata on IPFS
     * @param projectCID CID of the project data on IPFS
     * @param royaltyReceiver Address to receive royalties
     * @param royaltyPercentage Royalty percentage (in basis points, e.g., 500 = 5%)
     */
    function mintResearchNFT(
        address to,
        string memory metadataURI,
        string memory projectCID,
        address royaltyReceiver,
        uint96 royaltyPercentage
    ) external returns (uint256) {
        require(cidToToken[projectCID] == 0, "Project already minted as NFT");
        require(royaltyPercentage <= 1000, "Royalty percentage too high"); // Max 10%

        _tokenIdCounter++;
        uint256 newTokenId = _tokenIdCounter;

        _safeMint(to, newTokenId);
        _setTokenURI(newTokenId, metadataURI);
        
        // Set royalty info (EIP-2981)
        _setTokenRoyalty(newTokenId, royaltyReceiver, royaltyPercentage);

        // Store project information
        tokenToCID[newTokenId] = projectCID;
        tokenToCreator[newTokenId] = msg.sender;
        cidToToken[projectCID] = newTokenId;

        emit NFTMinted(newTokenId, msg.sender, to, projectCID, metadataURI);

        return newTokenId;
    }

    /**
     * @dev Get the project CID for a token
     */
    function getProjectCID(uint256 tokenId) external view returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return tokenToCID[tokenId];
    }

    /**
     * @dev Get the creator of a token
     */
    function getCreator(uint256 tokenId) external view returns (address) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return tokenToCreator[tokenId];
    }

    /**
     * @dev Check if a project CID has already been minted
     */
    function isMinted(string memory projectCID) external view returns (bool) {
        return cidToToken[projectCID] != 0;
    }

    /**
     * @dev Override supportsInterface to support ERC2981
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721URIStorage, ERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
