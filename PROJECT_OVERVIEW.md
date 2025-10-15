# AI Research Marketplace - Project Overview

A decentralized platform for creating, minting, trading, and monetizing AI-powered research conversations as NFTs, built with blockchain technology and IPFS.

## 🚀 Features

### Phase 1-2: Core Infrastructure
- **React Flow Canvas**: Interactive node-based conversation editor
- **Multi-Model AI**: Support for multiple Groq AI models (Llama 3.3 70B Versatile)
- **Web3 Integration**: MetaMask wallet connection with multi-chain support (Ethereum, Polygon)
- **Real-time Balance Tracking**: ETH and PYUSD balance display

### Phase 3: IPFS Storage
- **Decentralized Storage**: Lighthouse.storage integration for permanent data hosting
- **Conversation Serialization**: Full conversation graph export to IPFS
- **NFT Metadata Generation**: ERC-721 compliant metadata with project details

### Phase 4: Smart Contracts
- **Research NFT Contract**: ERC-721 with EIP-2981 royalty support
- **Marketplace Contract**: PYUSD-based trading platform
- **On-chain Verification**: Prevents duplicate minting of the same research

### Phase 5: Marketplace UI
- **Browse Listings**: Discover and filter research NFTs
- **Purchase Flow**: Buy NFTs with PYUSD stablecoin
- **Project Details**: View research metadata, CIDs, and creator information
- **Transaction Processing**: Secure blockchain transactions with status tracking

### Phase 6: Project Management
- **Dashboard**: Comprehensive project overview
- **NFT Minting**: Convert research projects to NFTs
- **Listing Management**: List NFTs for sale on the marketplace
- **Status Tracking**: Monitor draft, minted, and listed states

### Phase 7: Analytics & Collaboration
- **Real-time Presence**: See who's online in the editor
- **Analytics Dashboard**: Track projects, sales, and activity
- **Activity Feed**: Recent transactions and project updates
- **Stats Overview**: Total projects, NFTs, listings, and sales

### Phase 8: Profiles & History
- **User Profiles**: Customizable profiles with bio, social links, and stats
- **Transaction History**: Complete record of all purchases and sales
- **Profile Discovery**: Click on creator addresses to view their profiles
- **Enhanced Navigation**: Quick access to profile and transaction history

### Phase 10: Enhanced Analytics with Charts
- **Interactive Visualizations**: Recharts integration for data visualization
- **Sales Trend Analysis**: Time-series line charts for sales and volume
- **Project Distribution**: Pie charts showing status breakdown
- **Top Creators Leaderboard**: Bar charts ranking creators by NFTs minted
- **Date Range Filtering**: Analyze data for 7, 30, or 90-day periods
- **Data Export**: Download analytics data as JSON

## 🏗️ Architecture

### Frontend Stack
- **React 18** with TypeScript
- **React Flow** for conversation graph visualization
- **TailwindCSS** for styling
- **Shadcn UI** for component library
- **Ethers.js** for Web3 interactions
- **React Router** for navigation

### Backend Stack
- **Supabase** for database and backend functions
- **PostgreSQL** with Row Level Security (RLS)
- **Edge Functions** for serverless logic
- **Real-time subscriptions** for live updates

### Blockchain Stack
- **Ethereum & Polygon** networks
- **PYUSD** stablecoin for payments
- **ERC-721** NFT standard
- **EIP-2981** royalty standard
- **Solidity 0.8.x** smart contracts

### Storage Stack
- **Lighthouse.storage** for IPFS pinning
- **IPFS** for decentralized file storage
- **Metadata on-chain** with off-chain references

## 📊 Database Schema

### Tables

**projects**
- Project metadata (name, description, CIDs)
- NFT status tracking (draft, minted, listed)
- Creator and owner wallet addresses
- View count and timestamps

**nft_listings**
- Active marketplace listings
- Price in PYUSD
- Listing status (active, sold, delisted)
- Transaction hashes

**transactions**
- Complete transaction history
- Buyer and seller addresses
- Amount and status
- Timestamps for creation and completion

**project_snapshots**
- Versioned conversation data
- Full graph serialization
- Allows project restore

**user_profiles**
- Username and bio
- Social links (Twitter, website)
- Avatar and profile customization
- Wallet address mapping

## 🔐 Security Features

- **Row Level Security (RLS)**: All tables protected with proper policies
- **Wallet-based Authentication**: No passwords, use Web3 wallet
- **Transaction Verification**: On-chain validation of all trades
- **IPFS Content Addressing**: Tamper-proof storage
- **Smart Contract Auditing**: OpenZeppelin standards

## 🎨 Key User Flows

### Creating & Minting Research
1. Connect wallet
2. Create conversation nodes with AI
3. Save project to database
4. Upload to IPFS (data + metadata)
5. Mint NFT on blockchain
6. Optionally list for sale

### Buying Research NFTs
1. Connect wallet
2. Browse marketplace
3. Select NFT to purchase
4. Approve PYUSD spending
5. Complete purchase transaction
6. NFT transferred to buyer

### Profile Management
1. Visit profile page
2. Edit username, bio, social links
3. View stats (projects, sales, purchases)
4. Access transaction history
5. Share profile with others

## 🚧 Deployment

### Prerequisites
- Node.js 18+
- Hardhat for contract deployment
- Supabase account
- Lighthouse API key
- Groq API key

### Environment Variables
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_key
LIGHTHOUSE_API_KEY=your_lighthouse_key
GROQ_API_KEY=your_groq_key
```

### Contract Deployment
See `contracts/DEPLOYMENT_GUIDE.md` for detailed instructions.

### Frontend Deployment
```bash
npm install
npm run build
```

Deploy the `dist` folder to your hosting provider.

## 📈 Future Enhancements

- [ ] Multi-language support
- [ ] Advanced search and filtering
- [ ] Collection features (group related research)
- [ ] Collaborative editing
- [ ] Research forking and remixing
- [ ] Enhanced analytics with charts
- [ ] Mobile app
- [ ] Integration with academic platforms
- [ ] Reputation system
- [ ] Governance features

## 🤝 Contributing

Contributions are welcome! Please read the contribution guidelines before submitting PRs.

## 📄 License

This project is open source under the MIT License.

## 🆘 Support

For issues and questions:
- Create an issue on GitHub
- Join our Discord community
- Email: support@research-marketplace.dev

## 🙏 Acknowledgments

- OpenZeppelin for contract libraries
- Supabase for backend infrastructure
- Lighthouse for IPFS hosting
- Groq for AI model access
- The Ethereum community

---

Built with ❤️ for the decentralized research community
