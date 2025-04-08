# Seedopoly

A blockchain-themed Monopoly game built with React and Tailwind CSS, featuring NFT integration, token staking, and voting mechanics.

## 🎮 Game Features

### Core Gameplay
- Turn-based board game with two players (Human vs Bot)
- Dice rolling mechanics with animation
- Property acquisition and rent collection
- Debt management system with automatic repayment
- Round-based progression with events

### Blockchain Integration
- NFT Marketplace with three types of Genesis Passports
  - Common (200 USDT): +5% APY boost
  - Rare (500 USDT): -10% rent reduction
  - Legendary (1000 USDT): Hack protection
- SUPR Token System
  - Staking on properties for increased rent
  - Voting on property upgrades
  - Token distribution through events

### Game Mechanics
- Property Types:
  - DEX (Decentralized Exchange)
  - NFT Marketplace
  - Lending Protocol
  - Yield Farm
  - Bridge
  - Oracle
- Special Spaces:
  - Hack Risk (Chance)
  - Gas Wars (Community Chest)
  - NFT Marketplace
  - Start (with yield earnings)

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm (v6 or higher)

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/seedopoly.git
   cd seedopoly
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Open [http://localhost:3000](http://localhost:3000) to view the game in your browser.

## 📁 Project Structure

```
seedopoly/
├── src/
│   ├── components/     # React components
│   │   ├── Board.js    # Game board component
│   │   ├── PlayerStats.js  # Player information display
│   │   └── PropertyCard.js # Property details card
│   ├── hooks/          # Custom React hooks
│   ├── utils/          # Utility functions
│   ├── App.js          # Main game logic
│   └── index.js        # Application entry point
├── public/             # Static assets
└── package.json        # Project dependencies
```

## 🛠️ Technologies Used

- **Frontend Framework**: React
- **Styling**: Tailwind CSS
- **State Management**: React Hooks
- **Animation**: CSS Transitions
- **Testing**: Jest, React Testing Library

## 🎯 Game Rules

1. **Starting the Game**
   - Each player starts with 2000 USDT
   - Players take turns rolling dice
   - Bot moves automatically after human player's turn

2. **Property Acquisition**
   - Buy properties when landing on unowned spaces
   - Properties generate yield when passing Start
   - Properties can be upgraded with SUPR tokens

3. **NFT System**
   - Maximum 3 NFTs per player
   - NFTs provide various benefits
   - Purchase at NFT Marketplace space

4. **Debt Management**
   - Automatic 20% repayment from earnings
   - Game over at 6000 USDT debt
   - Debt affects property earnings

5. **Winning Conditions**
   - Opponent reaches 6000 USDT debt
   - All properties owned by one player
   - Opponent bankrupt

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. 