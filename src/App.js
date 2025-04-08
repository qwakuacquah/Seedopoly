import React, { useState, useEffect, useCallback, useMemo } from 'react';
import GameEvent, { events } from './components/GameEvent';
import './App.css';

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Game Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-screen">
          <h2>Something went wrong!</h2>
          <p>{this.state.error?.message || 'An unexpected error occurred'}</p>
          <button onClick={() => window.location.reload()}>Restart Game</button>
        </div>
      );
    }

    return this.props.children;
  }
}

const BOARD_SIZE = 16;
const REPAYMENT_RATE = 0.2; // 20% of earnings go toward debt repayment

// Define NFT types
const NFT_TYPES = [
  { name: "Genesis Passport", rarity: "Common", cost: 200, effect: "apyBoost", value: 0.01 },
  { name: "Genesis Passport", rarity: "Rare", cost: 500, effect: "rentReduction", value: 0.10 },
  { name: "Genesis Passport", rarity: "Legendary", cost: 1000, effect: "hackProtection", value: 1 }
];

const App = () => {
  const [players, setPlayers] = useState([
    { id: 0, name: "You", money: 2000, properties: [], position: 0, debt: 5000, nfts: [], suprTokens: 0 },
    { id: 1, name: "Bot", money: 2000, properties: [], position: 0, debt: 5000, nfts: [], suprTokens: 0 }
  ]);
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [round, setRound] = useState(1);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [activeEffects, setActiveEffects] = useState([]);
  const [log, setLog] = useState([]);
  const [isRolling, setIsRolling] = useState(false);
  const [gameOver, setGameOver] = useState({ status: false, winner: null });
  const [diceAnimation, setDiceAnimation] = useState(false);
  const [currentDiceFace, setCurrentDiceFace] = useState(1);
  const [marketIndex, setMarketIndex] = useState(0); // Market Index for volatility
  const [liquidityPool, setLiquidityPool] = useState({ total: 0, deposits: {} }); // Liquidity Pool state
  const [votes, setVotes] = useState({
    increaseValidatorApy: 0,
    reduceGasFees: 0,
    triggerMarketBoom: 0
  }); // Governance votes
  const [boardSpaces, setBoardSpaces] = useState([
    { type: "corner", name: "Start" },
    { type: "Validator", name: "Basic Validator 1", cost: 500, apy: 0.05, risk: "Low" },
    { type: "Farm", name: "Yield Farm 1", cost: 800, apy: 0.10, risk: "Medium" },
    { type: "Bot", name: "MEV Bot 1", cost: 1500, apy: 0.20, risk: "High" },
    { type: "event", name: "Bull Market" },
    { type: "corner", name: "Gas Wars" },
    { type: "Bot", name: "MEV Bot 2", cost: 1500, apy: 0.20, risk: "High" },
    { type: "Validator", name: "Basic Validator 2", cost: 500, apy: 0.05, risk: "Low" },
    { type: "event", name: "Bear Market" },
    { type: "corner", name: "Hack Risk" },
    { type: "Farm", name: "Yield Farm 2", cost: 800, apy: 0.10, risk: "Medium" },
    { type: "event", name: "Flash Loan" },
    { type: "Validator", name: "Basic Validator 3", cost: 500, apy: 0.05, risk: "Low" },
    { type: "Farm", name: "Yield Farm 3", cost: 800, apy: 0.10, risk: "Medium" },
    { type: "nft", name: "NFT Marketplace" },
    { type: "liquidity", name: "Liquidity Pool" }
  ].map(space => ({
    ...space,
    displayCost: space.cost ? `${space.cost} USDT` : null
  })));
  const [eventTriggeredThisRound, setEventTriggeredThisRound] = useState(false);
  const [purchaseTimer, setPurchaseTimer] = useState(null);
  const [timeLeft, setTimeLeft] = useState(3);
  const [turnComplete, setTurnComplete] = useState(true);
  const [showRules, setShowRules] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState(0);

  // Wrap voteOptions in useMemo to prevent unnecessary re-renders
  const voteOptions = useMemo(() => [
    { id: "increaseValidatorApy", name: "Increase Validator APY by 2%", effect: () => {
      setBoardSpaces(prev => prev.map(space => 
        space.type === "Validator" ? { ...space, apy: space.apy + 0.02 } : space
      ));
    }},
    { id: "reduceGasFees", name: "Reduce Gas Fees by 50%", effect: () => {
      // Gas fee reduction logic is applied in handleLanding
    }},
    { id: "triggerMarketBoom", name: "Trigger a Market Boom (+30% Market Index)", effect: () => {
      setMarketIndex(prev => Math.min(50, prev + 30));
    }}
  ], []); // Empty dependency array since the options are static

  const applyDebtRepayment = useCallback((playerId, earnings, source) => {
    const player = players.find(p => p.id === playerId);
    if (earnings <= 0 || player.debt <= 0) return earnings;

    const repaymentAmount = Math.floor(earnings * REPAYMENT_RATE);
    const remainingEarnings = earnings - repaymentAmount;

    setPlayers(prev => prev.map(p => {
      if (p.id === playerId) {
        const newDebt = Math.max(0, p.debt - repaymentAmount);
        return {
          ...p,
          money: p.money + remainingEarnings,
          debt: newDebt
        };
      }
      return p;
    }));

    setLog(prev => [
      `${player.name} earned ${earnings} USDT from ${source}, ${repaymentAmount} USDT auto-paid to debt (Remaining debt: ${Math.max(0, player.debt - repaymentAmount)} USDT)`,
      ...prev
    ]);

    const updatedPlayer = players.find(p => p.id === playerId);
    if (updatedPlayer.debt <= 0) {
      setGameOver({ status: true, winner: playerId === 0 ? 'human' : 'bot' });
      setLog(prev => [`${player.name} has paid off all debt and won the game!`, ...prev]);
    } else if (updatedPlayer.debt >= 6000) {
      setGameOver({ status: true, winner: playerId === 0 ? 'bot' : 'human' });
      setLog(prev => [`${player.name} has reached 6,000 USDT in debt and lost the game!`, ...prev]);
    }

    return remainingEarnings;
  }, [players]);

  const skipPurchase = useCallback(() => {
    if (purchaseTimer) {
      clearInterval(purchaseTimer);
      setPurchaseTimer(null);
    }
    setSelectedProperty(null);
    setLog(prev => [`You chose not to buy the property`, ...prev]);
    setTurnComplete(true);
    
    if (!gameOver.status) {
      setCurrentPlayer(1);
    }
  }, [purchaseTimer, gameOver]);

  const checkGameOver = useCallback((playerId) => {
    const player = players.find(p => p.id === playerId);
    if (player.debt >= 6000) {
      setGameOver({ status: true, winner: player.id === 0 ? 'bot' : 'human' });
      setLog(prev => [`${player.name} has reached 6,000 USDT in debt and lost the game!`, ...prev]);
    }
  }, [players]);

  const buyProperty = useCallback((playerId, property) => {
    if (!property || property.owner !== undefined) return;
    
    if (purchaseTimer) {
      clearInterval(purchaseTimer);
      setPurchaseTimer(null);
    }
    
    const propertyWithOwner = { ...property, owner: playerId, stakedAmount: 0 };
    
    setPlayers(prev => prev.map(p => {
      if (p.id === playerId) {
        if (p.money < property.cost) {
          setLog(prev => [`${p.name} cannot afford ${property.name}`, ...prev]);
          return p;
        }
        
        const updatedPlayer = {
          ...p,
          money: p.money - property.cost,
          properties: [...p.properties, propertyWithOwner]
        };
        
        setLog(prev => [`${p.name} bought ${property.name} for ${property.cost} USDT`, ...prev]);
        return updatedPlayer;
      }
      return p;
    }));
    
    setBoardSpaces(prev => prev.map(space => 
      space.name === property.name ? propertyWithOwner : space
    ));
    
    setSelectedProperty(null);
    setTurnComplete(true);
    
    if (playerId === 0 && !gameOver.status) {
      setCurrentPlayer(1);
    }
  }, [purchaseTimer, gameOver]);

  const buyNFT = useCallback((playerId, nft) => {
    const player = players.find(p => p.id === playerId);
    if (player.money < nft.cost) {
      setLog(prev => [`${player.name} cannot afford ${nft.name} (${nft.rarity})`, ...prev]);
      return;
    }
    setPlayers(prev => prev.map(p => 
      p.id === playerId ? { 
        ...p, 
        money: p.money - nft.cost,
        nfts: [...p.nfts, nft]
      } : p
    ));
    setLog(prev => [`${player.name} bought ${nft.name} (${nft.rarity}) for ${nft.cost} USDT`, ...prev]);
    setSelectedProperty(null);
    setTurnComplete(true);
    if (playerId === 0 && !gameOver.status) {
      setCurrentPlayer(1);
    }
  }, [players, gameOver]);

  const stakeOnProperty = useCallback((playerId, propertyName, amount) => {
    const player = players.find(p => p.id === playerId);
    const property = player.properties.find(prop => prop.name === propertyName);
    if (!property) return;
    const maxStake = property.cost * 0.5; // Max stake is 50% of property cost in SUPR tokens
    const newStake = Math.min(amount, maxStake - (property.stakedAmount || 0));
    if ((player.suprTokens || 0) < newStake) {
      setLog(prev => [`${player.name} doesn't have enough SUPR tokens to stake ${newStake} on ${propertyName}`, ...prev]);
      return;
    }
    setPlayers(prev => prev.map(p => {
      if (p.id === playerId) {
        return {
          ...p,
          suprTokens: (p.suprTokens || 0) - newStake,
          properties: p.properties.map(prop => 
            prop.name === propertyName 
              ? { ...prop, stakedAmount: (prop.stakedAmount || 0) + newStake }
              : prop
          )
        };
      }
      return p;
    }));
    setLog(prev => [`${player.name} staked ${newStake} SUPR tokens on ${propertyName}`, ...prev]);
  }, [players]);

  const depositToPool = useCallback((playerId, amount) => {
    const player = players.find(p => p.id === playerId);
    if (player.money < amount) {
      setLog(prev => [`${player.name} doesn't have enough USDT to deposit`, ...prev]);
      return;
    }
    setLiquidityPool(prev => ({
      total: prev.total + amount,
      deposits: { ...prev.deposits, [playerId]: (prev.deposits[playerId] || 0) + amount }
    }));
    setPlayers(prev => prev.map(p => 
      p.id === playerId ? { ...p, money: p.money - amount } : p
    ));
    setLog(prev => [`${player.name} deposited ${amount} USDT into the Liquidity Pool`, ...prev]);
    setSelectedProperty(null);
    setTurnComplete(true);
    if (playerId === 0 && !gameOver.status) {
      setCurrentPlayer(1);
    }
  }, [players, gameOver]);

  const withdrawFromPool = useCallback((playerId) => {
    const player = players.find(p => p.id === playerId);
    const deposit = liquidityPool.deposits[playerId] || 0;
    if (deposit === 0) {
      setLog(prev => [`${player.name} has no deposit in the Liquidity Pool`, ...prev]);
      return;
    }
    
    // Calculate share of fees
    const poolFees = Math.floor(liquidityPool.total * 0.05);
    const share = (deposit / liquidityPool.total) * poolFees;
    
    setLiquidityPool(prev => ({
      total: prev.total - deposit,
      deposits: { ...prev.deposits, [playerId]: 0 }
    }));
    
    setPlayers(prev => prev.map(p => 
      p.id === playerId ? { ...p, money: p.money + deposit + share } : p
    ));
    
    setLog(prev => [
      `${player.name} withdrew ${deposit} USDT from the Liquidity Pool`,
      share > 0 ? `and earned ${share} USDT in fees` : null,
      ...prev
    ].filter(Boolean));
    
    setSelectedProperty(null);
    setTurnComplete(true);
    if (playerId === 0 && !gameOver.status) {
      setCurrentPlayer(1);
    }
  }, [players, liquidityPool, gameOver]);

  const castVote = useCallback((playerId, optionId) => {
    const player = players.find(p => p.id === playerId);
    if ((player.suprTokens || 0) < 1) {
      setLog(prev => [`${player.name} doesn't have enough SUPR tokens to vote`, ...prev]);
      return;
    }
    setPlayers(prev => prev.map(p => 
      p.id === playerId ? { ...p, suprTokens: p.suprTokens - 1 } : p
    ));
    setVotes(prev => ({
      ...prev,
      [optionId]: prev[optionId] + 1
    }));
    setLog(prev => [`${player.name} voted for ${voteOptions.find(opt => opt.id === optionId).name}`, ...prev]);
  }, [players, voteOptions]);

  const handleLanding = useCallback((player, space) => {
    if (!space) return;

    const rentReduction = player.nfts.reduce((acc, nft) => 
      nft.effect === 'rentReduction' ? acc + nft.value : acc, 0);

    switch (space.type) {
      case 'Validator':
      case 'Farm':
      case 'Bot':
        if (space.owner === undefined) {
          if (player.id === 0) {
            setSelectedProperty(space);
            setLog(prev => [`You can buy ${space.name} for ${space.cost} USDT`, ...prev]);
          } else {
            const canAfford = player.money >= space.cost;
            const isGoodDeal = space.apy > 0.1;
            if (canAfford && isGoodDeal) {
              buyProperty(player.id, space);
            } else {
              setLog(prev => [`Bot chose not to buy ${space.name}`, ...prev]);
              setTurnComplete(true);
            }
          }
        } else if (space.owner !== player.id) {
          const owner = players.find(p => p.id === space.owner);
          if (owner) {
            let rentPercentage;
            switch (space.type) {
              case 'Validator':
                rentPercentage = 0.15;
                break;
              case 'Farm':
                rentPercentage = 0.20;
                break;
              case 'Bot':
                rentPercentage = 0.25;
                break;
              default:
                rentPercentage = 0.10;
            }
            const apyBonus = space.apy * 100;
            const baseRent = Math.floor(space.cost * (rentPercentage + (apyBonus / 100)));
            const adjustedRent = Math.floor(baseRent * (1 - rentReduction));
            if (player.money >= adjustedRent) {
              setPlayers(prev => prev.map(p => {
                if (p.id === player.id) {
                  return { ...p, money: p.money - adjustedRent };
                } else if (p.id === owner.id) {
                  return p;
                }
                return p;
              }));
              applyDebtRepayment(owner.id, adjustedRent, `rent from ${space.name}`);
              setLog(prev => [
                `${player.name} paid ${adjustedRent} USDT rent to ${owner.name} (${(rentPercentage * 100).toFixed(0)}% + ${apyBonus.toFixed(1)}% APY bonus${rentReduction > 0 ? `, ${rentReduction * 100}% rent reduction` : ''})`,
                ...prev
              ]);
            } else {
              const remainingRent = adjustedRent - player.money;
              setPlayers(prev => prev.map(p => {
                if (p.id === player.id) {
                  return { 
                    ...p, 
                    money: 0,
                    debt: p.debt + remainingRent 
                  };
                } else if (p.id === owner.id) {
                  return p;
                }
                return p;
              }));
              applyDebtRepayment(owner.id, player.money, `rent from ${space.name}`);
              setLog(prev => [
                `${player.name} couldn't afford full rent. Paid ${player.money} USDT and added ${remainingRent} USDT to debt`,
                ...prev
              ]);
              checkGameOver(player.id);
            }
            setTurnComplete(true);
          }
        } else {
          setTurnComplete(true);
        }
        break;

      case 'nft':
        if (player.id === 0) {
          if (player.nfts.length < 3) {
            setSelectedProperty(space);
            setLog(prev => [`You can buy a Genesis Passport NFT at the NFT Marketplace`, ...prev]);
          } else {
            setLog(prev => [`You already have the maximum number of NFTs (3)`, ...prev]);
            setTurnComplete(true);
          }
        } else {
          // Bot's NFT purchase logic
          if (player.nfts.length < 3) {
            const randomNFT = NFT_TYPES[Math.floor(Math.random() * NFT_TYPES.length)];
            if (player.money >= randomNFT.cost) {
              buyNFT(player.id, randomNFT);
            } else {
              setLog(prev => [`Bot chose not to buy an NFT`, ...prev]);
            }
          }
          setTurnComplete(true);
        }
        break;

      case 'corner':
        if (space.name === 'Hack Risk') {
          const hasProtection = player.nfts.some(nft => nft.effect === 'hackProtection');
          if (hasProtection) {
            setPlayers(prev => prev.map(p => 
              p.id === player.id ? { 
                ...p, 
                nfts: p.nfts.filter(nft => nft.effect !== 'hackProtection')
              } : p
            ));
            setLog(prev => [`${player.name} was protected from a hack by a Genesis Passport (Legendary)!`, ...prev]);
            setTurnComplete(true);
            return;
          }
          const hackAmount = Math.floor(Math.random() * 300) + 200;
          const stakeLoss = player.properties.reduce((acc, prop) => {
            const loss = (prop.stakedAmount || 0) * 0.5; // Lose 50% of staked SUPR tokens
            return acc + loss;
          }, 0);
          setPlayers(prev => prev.map(p => 
            p.id === player.id ? { 
              ...p, 
              money: p.money - hackAmount < 0 ? 0 : p.money - hackAmount,
              debt: p.money - hackAmount < 0 ? p.debt + Math.abs(p.money - hackAmount) : p.debt,
              properties: p.properties.map(prop => ({
                ...prop,
                stakedAmount: Math.floor((prop.stakedAmount || 0) * 0.5)
              }))
            } : p
          ));
          setLog(prev => [
            `${player.name} lost ${hackAmount} USDT and 50% of staked SUPR tokens (${stakeLoss} SUPR) from a hack!`,
            ...prev
          ]);
        } else if (space.name === 'Gas Wars') {
          const gasFee = votes.reduceGasFees > 0 ? 50 : 100; // Reduce gas fees if voted
          if (player.money >= gasFee) {
            setPlayers(prev => prev.map(p => 
              p.id === player.id ? { ...p, money: p.money - gasFee } : p
            ));
            setLog(prev => [`${player.name} paid ${gasFee} USDT in gas fees!`, ...prev]);
          } else {
            const remainingFee = gasFee - player.money;
            setPlayers(prev => prev.map(p => 
              p.id === player.id ? { 
                ...p, 
                money: 0,
                debt: p.debt + remainingFee 
              } : p
            ));
            setLog(prev => [
              `${player.name} paid ${player.money.toFixed(2)} USDT and added ${remainingFee.toFixed(2)} USDT to debt for gas fees!`,
              ...prev
            ]);
          }
        }
        setTurnComplete(true);
        break;

      case 'event':
        const eventEffect = Math.floor(Math.random() * 200) - 100;
        if (eventEffect >= 0) {
          applyDebtRepayment(player.id, eventEffect, space.name);
        } else {
          const lossAmount = Math.abs(eventEffect);
          if (player.money >= lossAmount) {
            setPlayers(prev => prev.map(p => 
              p.id === player.id ? { ...p, money: p.money - lossAmount } : p
            ));
            setLog(prev => [`${player.name} lost ${lossAmount} USDT from ${space.name}!`, ...prev]);
          } else {
            const remainingLoss = lossAmount - player.money;
            setPlayers(prev => prev.map(p => 
              p.id === player.id ? { 
                ...p, 
                money: 0,
                debt: p.debt + remainingLoss 
              } : p
            ));
            setLog(prev => [
              `${player.name} lost all ${player.money.toFixed(2)} USDT and added ${remainingLoss.toFixed(2)} USDT to debt from ${space.name}!`,
              ...prev
            ]);
          }
        }
        setTurnComplete(true);
        break;

      case 'liquidity':
        if (player.id === 0) {
          setSelectedProperty(space);
          setLog(prev => [
            `You can deposit USDT into the Liquidity Pool`,
            `Current pool size: ${liquidityPool.total} USDT`,
            `Your deposit: ${liquidityPool.deposits[player.id] || 0} USDT`,
            `Pool APY: 5%`,
            ...prev
          ]);
        } else {
          // Bot's liquidity pool logic
          const deposit = Math.floor(player.money * 0.2); // Bot deposits 20% of its money
          if (deposit >= 100) { // Minimum deposit is 100 USDT
            depositToPool(player.id, deposit);
          } else {
            setLog(prev => [`Bot chose not to deposit into the Liquidity Pool`, ...prev]);
            setTurnComplete(true);
          }
        }
        break;

      default:
        setTurnComplete(true);
        break;
    }
  }, [players, buyProperty, checkGameOver, applyDebtRepayment, votes, buyNFT, liquidityPool, depositToPool]);

  const payDebt = useCallback((amount) => {
    const player = players[currentPlayer];
    if (player.money >= amount) {
      setPlayers(prev => {
        const updated = [...prev];
        updated[currentPlayer] = {
          ...player,
          money: player.money - amount,
          debt: Math.max(0, player.debt - amount)
        };
        return updated;
      });
      setLog(prev => [`${player.name} paid ${amount} USDT towards debt. Remaining debt: ${Math.max(0, player.debt - amount)} USDT`, ...prev]);
      
      if (player.debt - amount <= 0) {
        setGameOver({ status: true, winner: player.id === 0 ? 'human' : 'bot' });
        setLog(prev => [`${player.name} has paid off all debt and won the game!`, ...prev]);
      }
    } else {
      setLog(prev => [`${player.name} doesn't have enough money to pay ${amount} USDT towards debt`, ...prev]);
    }
  }, [currentPlayer, players]);

  const resetGame = () => {
    setPlayers([
      { id: 0, name: "You", money: 2000, properties: [], position: 0, debt: 5000, nfts: [], suprTokens: 0 },
      { id: 1, name: "Bot", money: 2000, properties: [], position: 0, debt: 5000, nfts: [], suprTokens: 0 }
    ]);
    
    setCurrentPlayer(0);
    setRound(1);
    setSelectedProperty(null);
    setCurrentEvent(null);
    setActiveEffects([]);
    setLog([]);
    setIsRolling(false);
    setDiceAnimation(false);
    setCurrentDiceFace(1);
    setMarketIndex(0);
    setLiquidityPool({ total: 0, deposits: {} });
    setVotes({ increaseValidatorApy: 0, reduceGasFees: 0, triggerMarketBoom: 0 });
    setTurnComplete(true);
    setBoardSpaces([
      { type: "corner", name: "Start" },
      { type: "Validator", name: "Basic Validator 1", cost: 500, apy: 0.05, risk: "Low" },
      { type: "Farm", name: "Yield Farm 1", cost: 800, apy: 0.10, risk: "Medium" },
      { type: "Bot", name: "MEV Bot 1", cost: 1500, apy: 0.20, risk: "High" },
      { type: "event", name: "Bull Market" },
      { type: "corner", name: "Gas Wars" },
      { type: "Bot", name: "MEV Bot 2", cost: 1500, apy: 0.20, risk: "High" },
      { type: "Validator", name: "Basic Validator 2", cost: 500, apy: 0.05, risk: "Low" },
      { type: "event", name: "Bear Market" },
      { type: "corner", name: "Hack Risk" },
      { type: "Farm", name: "Yield Farm 2", cost: 800, apy: 0.10, risk: "Medium" },
      { type: "event", name: "Flash Loan" },
      { type: "Validator", name: "Basic Validator 3", cost: 500, apy: 0.05, risk: "Low" },
      { type: "Farm", name: "Yield Farm 3", cost: 800, apy: 0.10, risk: "Medium" },
      { type: "nft", name: "NFT Marketplace" },
      { type: "liquidity", name: "Liquidity Pool" }
    ].map(space => ({
      ...space,
      displayCost: space.cost ? `${space.cost} USDT` : null
    })));
    
    if (purchaseTimer) {
      clearInterval(purchaseTimer);
      setPurchaseTimer(null);
    }
  };

  const rollDice = useCallback(() => {
    if (isRolling || gameOver.status || !turnComplete) return;
    
    setIsRolling(true);
    setTurnComplete(false);
    const roll = Math.floor(Math.random() * 6) + 1;
    setDiceAnimation(true);
    setCurrentDiceFace(roll);
    
    const currentPlayerObj = players[currentPlayer];
    const newPosition = (currentPlayerObj.position + roll) % BOARD_SIZE;
    const currentSpace = boardSpaces[newPosition];
    
    setTimeout(() => {
      setDiceAnimation(false);
      
      setPlayers(prev => prev.map(p => {
        if (p.id === currentPlayerObj.id) {
          const updatedPlayer = { ...p, position: newPosition };
          
          if (newPosition < p.position) {
            // Calculate APY boost from NFTs
            const apyBoost = p.nfts.reduce((acc, nft) => 
              nft.effect === 'apyBoost' ? acc + nft.value : acc, 0);
            
            // Calculate yields from properties and staked SUPR
            const propertyYields = p.properties.reduce((acc, prop) => {
              const baseYield = prop.cost * (prop.apy + apyBoost); // Apply APY boost
              const stakingBonus = (prop.stakedAmount || 0) * 0.05; // 5% APY on staked SUPR
              return acc + baseYield + stakingBonus;
            }, 0);
            
            const maintenanceCost = p.properties.reduce((acc, prop) => acc + prop.cost * 0.05, 0);
            const earnings = Math.floor(propertyYields - maintenanceCost);
            
            // Calculate SUPR token rewards from staking
            const suprRewards = p.properties.reduce((acc, prop) => {
              const stakedAmount = prop.stakedAmount || 0;
              return acc + Math.floor(stakedAmount * 0.05); // 5% APY on staked SUPR
            }, 0);
            
            // Apply debt repayment and update player state
            applyDebtRepayment(p.id, earnings, "properties");
            
            // Log the detailed earnings breakdown
            setLog(prev => [
              `${p.name} earned ${earnings} USDT from properties (${Math.floor(propertyYields)} USDT yield - ${maintenanceCost} USDT maintenance)`,
              apyBoost > 0 ? `${p.name} received a ${apyBoost * 100}% APY boost from Genesis Passport` : null,
              suprRewards > 0 ? `${p.name} earned ${suprRewards} SUPR tokens from staking` : null,
              ...prev
            ].filter(Boolean));
            
            return { 
              ...updatedPlayer, 
              suprTokens: (updatedPlayer.suprTokens || 0) + 5 + suprRewards // Earn 5 SUPR tokens for passing Start plus staking rewards
            };
          }
          
          return updatedPlayer;
        }
        return p;
      }));
      
      setSelectedProperty(null);
      
      if (currentSpace) {
        handleLanding(currentPlayerObj, currentSpace);
        
        setTimeout(() => {
          const isPropertyPurchaseDecision = currentSpace.cost && 
                                           currentSpace.apy && 
                                           currentSpace.owner === undefined && 
                                           currentPlayer === 0;
          const isNFTPurchaseDecision = currentSpace.type === 'nft' && 
                                       currentPlayer === 0 && 
                                       players[currentPlayer].nfts.length < 3;
          const isLiquidityDepositDecision = currentSpace.type === 'liquidity' && 
                                            currentPlayer === 0;
                                            
          if (!isPropertyPurchaseDecision && !isNFTPurchaseDecision && !isLiquidityDepositDecision) {
            setTurnComplete(true);
            const nextPlayer = currentPlayer === 0 ? 1 : 0;
            setCurrentPlayer(nextPlayer);
            
            if (nextPlayer === 0) {
              setRound(prev => {
                const newRound = prev + 1;
                const newMarketIndex = Math.floor(Math.random() * 101) - 50;
                setMarketIndex(newMarketIndex);
                
                // Calculate and distribute Liquidity Pool fees
                const poolFees = Math.floor(liquidityPool.total * 0.05);
                if (poolFees > 0) {
                  setPlayers(prevPlayers => prevPlayers.map(p => {
                    const deposit = liquidityPool.deposits[p.id] || 0;
                    if (deposit === 0) return p;
                    const share = (deposit / liquidityPool.total) * poolFees;
                    let newDeposit = deposit;
                    if (newMarketIndex < -30) { // Impermanent loss if market drops significantly
                      const loss = Math.floor(deposit * 0.2); // 20% loss
                      newDeposit -= loss;
                      setLog(prevLog => [
                        `${p.name} suffered a ${loss} USDT impermanent loss in the Liquidity Pool`,
                        ...prevLog
                      ]);
                    }
                    setLiquidityPool(prevPool => ({
                      total: prevPool.total - deposit + newDeposit,
                      deposits: { ...prevPool.deposits, [p.id]: newDeposit }
                    }));
                    return { ...p, money: p.money + share };
                  }));
                }
                
                // Apply the winning vote
                const winningVote = Object.keys(votes).reduce((a, b) => votes[a] > votes[b] ? a : b);
                if (votes[winningVote] > 0) {
                  voteOptions.find(opt => opt.id === winningVote).effect();
                  setLog(prevLog => [
                    `Round ${newRound} begins! Market Index: ${newMarketIndex}%`,
                    `Liquidity Pool distributed ${poolFees} USDT in fees`,
                    `Community voted to ${voteOptions.find(opt => opt.id === winningVote).name}`,
                    ...prevLog
                  ]);
                } else {
                  setLog(prevLog => [
                    `Round ${newRound} begins! Market Index: ${newMarketIndex}%`,
                    `Liquidity Pool distributed ${poolFees} USDT in fees`,
                    ...prevLog
                  ]);
                }
                setVotes({ increaseValidatorApy: 0, reduceGasFees: 0, triggerMarketBoom: 0 });
                setEventTriggeredThisRound(false);
                return newRound;
              });
            }
          } else {
            setLog(prev => [`Click "Skip" to end your turn`, ...prev]);
          }
        }, 500);
      }
      
      setIsRolling(false);
    }, 1000);
  }, [isRolling, gameOver, players, currentPlayer, handleLanding, boardSpaces, turnComplete, applyDebtRepayment, liquidityPool, votes, voteOptions]);

  useEffect(() => {
    if (currentPlayer === 1 && !isRolling && !gameOver.status && !selectedProperty && turnComplete) {
      // Bot's turn: Perform actions like staking, voting, etc.
      const bot = players[1];
      let timer;
      
      try {
        // Bot stakes SUPR tokens on properties
        bot.properties.forEach(prop => {
          const maxStake = prop.cost * 0.5 - (prop.stakedAmount || 0);
          const stakeAmount = Math.min(bot.suprTokens || 0, maxStake, 50); // Bot stakes up to 50 SUPR
          if (stakeAmount > 0) {
            stakeOnProperty(bot.id, prop.name, stakeAmount);
            setLog(prev => [`Bot staked ${stakeAmount} SUPR on ${prop.name}`, ...prev]);
          }
        });
        
        // Bot votes with SUPR tokens only if it has enough
        if (bot.suprTokens >= 1) {
          const randomVote = voteOptions[Math.floor(Math.random() * voteOptions.length)].id;
          castVote(bot.id, randomVote);
          setLog(prev => [`Bot voted for ${voteOptions.find(opt => opt.id === randomVote).name} (${bot.suprTokens} SUPR remaining)`, ...prev]);
        } else {
          setLog(prev => [`Bot has no SUPR tokens to vote with`, ...prev]);
        }
        
        setLog(prev => [`Bot's turn...`, ...prev]);
        timer = setTimeout(() => {
          rollDice();
        }, 1000);
      } catch (error) {
        console.error('Error during bot turn:', error);
        setLog(prev => [`Error during bot's turn: ${error.message}`, ...prev]);
        // Ensure we still roll dice even if there's an error
        timer = setTimeout(() => {
          rollDice();
        }, 1000);
      }
      
      return () => {
        if (timer) {
          clearTimeout(timer);
        }
      };
    }
  }, [currentPlayer, isRolling, gameOver, rollDice, selectedProperty, turnComplete, players, stakeOnProperty, castVote, voteOptions]);

  useEffect(() => {
    if (!isRolling && !gameOver.status && !eventTriggeredThisRound && currentPlayer === 0) {
      if (Math.random() < 0.3) {
        const randomEvent = events[Math.floor(Math.random() * events.length)];
        setCurrentEvent(randomEvent);
        setEventTriggeredThisRound(true);
        setLog(prev => [`Round ${round}: ${randomEvent.title}`, ...prev]);
      } else {
        setEventTriggeredThisRound(true);
      }
    }
  }, [round, isRolling, gameOver, eventTriggeredThisRound, currentPlayer]);

  useEffect(() => {
    if (selectedProperty && currentPlayer === 0) {
      setTimeLeft(3);
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            skipPurchase();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      setPurchaseTimer(timer);
      return () => clearInterval(timer);
    }
  }, [selectedProperty, currentPlayer, skipPurchase]);

  const handleEventEffect = () => {
    if (currentEvent) {
      const updatedPlayers = currentEvent.effect(players);
      setPlayers(updatedPlayers);
      checkGameOver(players[currentPlayer].id);
      if (currentEvent.duration) {
        setActiveEffects(prev => [
          ...prev,
          { ...currentEvent, roundsLeft: currentEvent.duration }
        ]);
      }
      setCurrentEvent(null);
    }
  };

  useEffect(() => {
    if (activeEffects.length > 0) {
      setActiveEffects(prev => {
        const updated = prev.map(effect => ({
          ...effect,
          roundsLeft: effect.roundsLeft - 1
        }));
        const expired = updated.filter(e => e.roundsLeft <= 0);
        if (expired.length > 0) {
          expired.forEach(effect => {
            const reverseEffect = effect.reverseEffect;
            if (reverseEffect) {
              setPlayers(prev => reverseEffect(prev));
            }
          });
        }
        return updated.filter(e => e.roundsLeft > 0);
      });
    }
  }, [activeEffects]);

  const getGridPosition = (index) => {
    if (index < 5) {
      return { gridColumn: index + 1, gridRow: 1 };
    } else if (index < 9) {
      return { gridColumn: 5, gridRow: index - 3 };
    } else if (index < 13) {
      return { gridColumn: 13 - index, gridRow: 5 };
    } else {
      return { gridColumn: 1, gridRow: 17 - index };
    }
  };

  if (gameOver.status) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Game Over!</h1>
          <p className="text-xl mb-6">{gameOver.winner === 'human' ? "You paid off your debt! Victory!" : "You're broke! Game Over!"}</p>
          <button onClick={() => window.location.reload()} className="px-6 py-2 bg-green-600 rounded hover:bg-green-700">Restart</button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 p-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-blue-500">
            🌱 Seedopoly
          </h1>
          <button
            onClick={() => setShowRules(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-all transform hover:scale-105"
          >
            Game Rules
          </button>
        </div>

        {/* Rules Modal */}
        {showRules && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-white">Game Rules</h2>
                <button
                  onClick={() => setShowRules(false)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4 text-gray-300">
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">Objective</h3>
                  <p>Be the first player to pay off your debt or drive your opponent into bankruptcy!</p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">Gameplay</h3>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Roll the dice to move around the board</li>
                    <li>Buy properties to earn passive income</li>
                    <li>Pay rent when landing on opponent's properties</li>
                    <li>Earn 5 SUPR tokens when passing Start</li>
                    <li>Stake SUPR tokens on properties for additional yield</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">Properties</h3>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Validators: 15% rent + APY bonus</li>
                    <li>Farms: 20% rent + APY bonus</li>
                    <li>Bots: 25% rent + APY bonus</li>
                    <li>Properties earn yield when passing Start</li>
                    <li>Maintenance cost: 5% of property value</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">NFTs (Genesis Passports)</h3>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Common: +1% APY boost to all properties</li>
                    <li>Rare: 10% rent reduction</li>
                    <li>Legendary: Protection from Hack Risk</li>
                    <li>Maximum 3 NFTs per player</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">Special Spaces</h3>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Hack Risk: Lose 50% of staked SUPR and 200-500 USDT</li>
                    <li>Gas Wars: Pay 100 USDT (50 if voted to reduce)</li>
                    <li>Events: Random positive or negative effects</li>
                    <li>Liquidity Pool: Deposit USDT to earn fees</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">Governance</h3>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Use SUPR tokens to vote on proposals</li>
                    <li>Increase Validator APY by 2%</li>
                    <li>Reduce Gas Fees by 50%</li>
                    <li>Trigger Market Boom (+30% Market Index)</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">Winning Conditions</h3>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Pay off all your debt</li>
                    <li>Opponent reaches 6,000 USDT in debt</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <div className="board relative grid grid-cols-5 grid-rows-5 gap-1 aspect-square bg-gray-800 bg-opacity-50 backdrop-blur-lg p-4 rounded-2xl border border-gray-700">
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
                  <span className="text-9xl">🌱</span>
                </div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
                  <div className={`dice ${diceAnimation ? 'rolling' : ''}`} style={{
                    width: '60px',
                    height: '60px',
                    background: 'white',
                    borderRadius: '12px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
                    transform: diceAnimation ? 'rotate(360deg)' : 'none',
                    transition: diceAnimation ? 'transform 0.5s ease-in-out' : 'none',
                    color: '#2d3748',
                    position: 'relative'
                  }}>
                    <div className="absolute inset-0 flex items-center justify-center text-2xl font-bold">
                      {currentDiceFace}
                    </div>
                  </div>
                </div>
                {boardSpaces.map((space, index) => {
                  const position = getGridPosition(index);
                  if (!position) return null;
                  const isCorner = space.type === 'corner';
                  return (
                    <div
                      key={index}
                      className={`board-tile ${space.type}`}
                      style={{
                        gridColumn: position.gridColumn,
                        gridRow: position.gridRow,
                        padding: '8px',
                        borderRadius: '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        textAlign: 'center',
                        color: 'white',
                        minHeight: isCorner ? '100px' : '70px',
                        minWidth: isCorner ? '100px' : '70px',
                        position: 'relative',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
                        border: '2px solid rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(5px)',
                        transform: 'scale(0.98)',
                        fontSize: isCorner ? '0.9em' : '0.75em'
                      }}
                    >
                      <div className="name" style={{ 
                        fontWeight: 'bold',
                        marginBottom: '4px',
                        textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
                        width: '100%',
                        textAlign: 'center'
                      }}>
                        {space.name}
                      </div>
                      {space.cost && (
                        <div className="cost" style={{ 
                          color: '#ffd700',
                          marginBottom: '4px',
                          textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
                          width: '100%',
                          textAlign: 'center'
                        }}>
                          {space.displayCost}
                        </div>
                      )}
                      {space.apy && (
                        <div className="apy" style={{ 
                          color: '#4ade80',
                          textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
                          width: '100%',
                          textAlign: 'center'
                        }}>
                          {(space.apy * 100).toFixed(1)}% APY
                        </div>
                      )}
                      {players.map((player, playerIndex) => {
                        if (player.position === index) {
                          return (
                            <div
                              key={player.id}
                              className={`player-marker ${player.id === 0 ? 'human' : 'ai'} ${currentPlayer === playerIndex ? 'current' : ''}`}
                              style={{
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                position: 'absolute',
                                bottom: playerIndex === 0 ? '2px' : '24px',
                                left: '2px',
                                backgroundColor: player.id === 0 ? '#3498db' : '#e74c3c',
                                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
                                border: '2px solid rgba(255, 255, 255, 0.8)',
                                transition: 'all 0.3s ease',
                                zIndex: 10,
                                animation: currentPlayer === playerIndex ? 'bounce 1s infinite' : 'none'
                              }}
                              title={`${player.name}: ${player.money.toFixed(2)} USDT`}
                            />
                          );
                        }
                        return null;
                      })}
                      {(['Validator', 'Farm', 'Bot'].includes(space.type)) && 
                       space.owner !== undefined && (
                        <div className="absolute top-2 right-2 w-4 h-4 rounded-full" style={{
                          backgroundColor: space.owner === 0 ? '#3498db' : '#e74c3c',
                          border: '1px solid rgba(255, 255, 255, 0.8)',
                          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
                        }} title={`Owned by ${players[space.owner].name}`} />
                      )}
                      {(['Validator', 'Farm', 'Bot'].includes(space.type)) && 
                       space.owner === undefined && 
                       players[currentPlayer].position === index && 
                       selectedProperty === space && (
                        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-full px-2 z-20">
                          <div className="text-center mb-2">
                            <span className="text-yellow-400 font-bold">{timeLeft}</span> seconds to decide
                          </div>
                          <button
                            onClick={() => buyProperty(players[currentPlayer].id, space)}
                            className={`w-full py-2 rounded-lg font-bold text-sm transition-all ${
                              players[currentPlayer].money >= space.cost
                                ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
                                : 'bg-red-500 text-white opacity-50 cursor-not-allowed'
                            }`}
                            disabled={players[currentPlayer].money < space.cost}
                          >
                            {players[currentPlayer].money >= space.cost
                              ? `Buy ${space.name} (${space.cost} USDT)`
                              : `Need ${space.cost - players[currentPlayer].money} more USDT`}
                          </button>
                          <button
                            onClick={skipPurchase}
                            className="w-full py-2 mt-1 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-bold"
                          >
                            Skip Purchase ({timeLeft}s)
                          </button>
                        </div>
                      )}
                      {space.type === 'nft' && 
                       players[currentPlayer].position === index && 
                       selectedProperty === space && (
                        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-full px-2 z-20">
                          <div className="text-center mb-2">
                            <span className="text-yellow-400 font-bold">{timeLeft}</span> seconds to decide
                          </div>
                          <div className="space-y-2">
                            {NFT_TYPES.map((nft, idx) => (
                              <button
                                key={idx}
                                onClick={() => buyNFT(players[currentPlayer].id, nft)}
                                className={`w-full py-2 rounded-lg font-bold text-sm transition-all ${
                                  players[currentPlayer].money >= nft.cost
                                    ? 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700'
                                    : 'bg-red-500 text-white opacity-50 cursor-not-allowed'
                                }`}
                                disabled={players[currentPlayer].money < nft.cost}
                              >
                                Buy {nft.name} ({nft.rarity}) - {nft.cost} USDT
                                <div className="text-xs mt-1">
                                  Effect: {nft.effect === 'apyBoost' ? `+${nft.value * 100}% APY` : 
                                         nft.effect === 'rentReduction' ? `${nft.value * 100}% Rent Reduction` :
                                         'Hack Protection'}
                                </div>
                              </button>
                            ))}
                          </div>
                          <button
                            onClick={skipPurchase}
                            className="w-full py-2 mt-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-bold"
                          >
                            Skip Purchase ({timeLeft}s)
                          </button>
                        </div>
                      )}
                      {space.type === 'liquidity' && currentPlayer === 0 && selectedProperty === space && (
                        <div className="absolute inset-0 bg-black bg-opacity-90 flex flex-col items-center justify-center p-4 rounded-lg">
                          <div className="text-center mb-4">
                            <h3 className="text-xl font-bold text-white mb-2">Liquidity Pool</h3>
                            <p className="text-gray-300">Current pool size: {liquidityPool.total} USDT</p>
                            <p className="text-gray-300">Your deposit: {liquidityPool.deposits[0] || 0} USDT</p>
                            <p className="text-gray-300">Pool APY: 5%</p>
                            {marketIndex < -25 && (
                              <p className="text-red-400 font-bold mt-2">
                                Warning: Market index is low ({marketIndex}%). Risk of impermanent loss!
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col space-y-2 w-full">
                            <input
                              type="number"
                              min="100"
                              step="100"
                              placeholder="Amount to deposit (min 100 USDT)"
                              className="w-full p-2 rounded bg-gray-700 text-white"
                              onChange={(e) => setSelectedAmount(parseInt(e.target.value))}
                            />
                            <button
                              onClick={() => depositToPool(0, selectedAmount)}
                              disabled={!selectedAmount || selectedAmount < 100 || players[0].money < selectedAmount}
                              className="w-full p-2 bg-green-600 hover:bg-green-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Deposit
                            </button>
                            {liquidityPool.deposits[0] > 0 && (
                              <button
                                onClick={() => withdrawFromPool(0)}
                                className="w-full p-2 bg-red-600 hover:bg-red-700 text-white rounded"
                              >
                                Withdraw
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setSelectedProperty(null);
                                setTurnComplete(true);
                                setCurrentPlayer(1);
                              }}
                              className="w-full p-2 bg-gray-600 hover:bg-gray-700 text-white rounded"
                            >
                              Skip
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="space-y-3">
              <div className="bg-gray-800 bg-opacity-50 backdrop-blur-lg rounded-xl p-3 text-white border border-gray-700">
                <h3 className="text-lg font-bold mb-2">Game Stats</h3>
                <div className="space-y-2">
                  {players.map((player, index) => (
                    <div key={player.id} className="p-2 rounded-lg bg-gray-700 bg-opacity-50">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">{player.name}</span>
                        <span className="text-yellow-400">{player.money.toFixed(2)} USDT</span>
                      </div>
                      <div className="text-sm text-gray-300">
                        Debt: {player.debt.toFixed(2)} USDT
                      </div>
                      <div className="text-sm text-gray-300">
                        SUPR Tokens: {player.suprTokens || 0}
                      </div>
                      <div className="text-sm text-gray-300">
                        Properties: {player.properties.length}
                      </div>
                      {player.properties.length > 0 && (
                        <div className="mt-1 space-y-1">
                          {player.properties.map((prop, idx) => (
                            <div key={idx} className="text-xs px-2 py-1 rounded bg-gray-600 bg-opacity-50 flex flex-col space-y-1">
                              <div className="flex justify-between items-center">
                                <span>{prop.name}</span>
                                <span className="text-green-400">{(prop.apy * 100).toFixed(1)}% APY</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span>Staked: {prop.stakedAmount || 0} SUPR</span>
                                <button
                                  onClick={() => {
                                    const amount = prompt(`How much SUPR to stake on ${prop.name}? (Max: ${Math.floor(prop.cost * 0.5 - (prop.stakedAmount || 0))})`);
                                    if (amount) stakeOnProperty(player.id, prop.name, parseInt(amount));
                                  }}
                                  className="text-xs px-2 py-1 bg-blue-500 rounded hover:bg-blue-600"
                                >
                                  Stake
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {player.nfts.length > 0 && (
                        <div className="mt-1 space-y-1">
                          <span className="text-sm">Genesis Passports:</span>
                          {player.nfts.map((nft, idx) => (
                            <div key={idx} className="text-xs px-2 py-1 rounded bg-gray-600 bg-opacity-50 flex justify-between items-center">
                              <span>{nft.name} ({nft.rarity})</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {liquidityPool.deposits[player.id] > 0 && (
                        <div className="mt-1 text-sm text-gray-300">
                          Liquidity Pool Deposit: {liquidityPool.deposits[player.id]} USDT
                        </div>
                      )}
                    </div>
                  ))}
                  <div className="text-sm text-gray-300">
                    Round: {round}
                  </div>
                  <div className="text-sm text-gray-300">
                    Market Index: <span className={marketIndex >= 0 ? 'text-green-400' : 'text-red-400'}>{marketIndex}%</span>
                  </div>
                </div>
              </div>
              <div className="bg-gray-800 bg-opacity-50 backdrop-blur-lg rounded-xl p-3 text-white border border-gray-700">
                <h3 className="text-lg font-bold mb-2">Pay Off Debt</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => payDebt(200)} 
                    className="px-3 py-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg font-bold hover:from-blue-600 hover:to-blue-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    disabled={players[currentPlayer].money < 200}
                  >
                    Pay 200 USDT
                  </button>
                  <button 
                    onClick={() => payDebt(500)} 
                    className="px-3 py-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg font-bold hover:from-blue-600 hover:to-blue-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    disabled={players[currentPlayer].money < 500}
                  >
                    Pay 500 USDT
                  </button>
                </div>
              </div>
              <div className="bg-gray-800 bg-opacity-50 backdrop-blur-lg rounded-xl p-3 text-white border border-gray-700">
                <h3 className="text-lg font-bold mb-2">Governance Voting</h3>
                <div className="text-sm text-gray-300 mb-2">
                  SUPR Tokens: {players[currentPlayer].suprTokens || 0}
                </div>
                {voteOptions.map(option => (
                  <div key={option.id} className="flex justify-between items-center mb-2">
                    <span>{option.name}</span>
                    <button
                      onClick={() => castVote(currentPlayer, option.id)}
                      className="px-2 py-1 bg-blue-500 rounded hover:bg-blue-600 text-xs"
                      disabled={(players[currentPlayer].suprTokens || 0) < 1}
                    >
                      Vote (1 SUPR)
                    </button>
                  </div>
                ))}
              </div>
              <div className="bg-gray-800 bg-opacity-50 backdrop-blur-lg rounded-xl p-3 text-white border border-gray-700">
                <h3 className="text-lg font-bold mb-2">Actions</h3>
                <div className="space-y-2">
                  <div className="flex flex-row gap-2">
                    <button 
                      onClick={rollDice} 
                      className="flex-1 py-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg font-bold text-sm hover:from-blue-600 hover:to-blue-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isRolling || currentPlayer !== 0 || !turnComplete}
                    >
                      {isRolling ? 'Rolling...' : 'Roll Dice'}
                    </button>
                    <button 
                      onClick={resetGame}
                      className="flex-1 py-2 bg-gradient-to-r from-red-500 to-red-600 rounded-lg font-bold text-sm hover:from-red-600 hover:to-red-700 transition-all transform hover:scale-105"
                    >
                      Reset
                    </button>
                  </div>
                  {currentPlayer === 0 && boardSpaces[players[currentPlayer].position] && (
                    <div className="mt-2 p-2 bg-gray-700 rounded-lg">
                      <p className="text-sm mb-1">Current Space:</p>
                      <p className="font-bold text-yellow-400">{boardSpaces[players[currentPlayer].position].name}</p>
                      {(boardSpaces[players[currentPlayer].position].cost) ? (
                        <>
                          <p className="text-sm">Cost: {boardSpaces[players[currentPlayer].position].cost} USDT</p>
                          <p className="text-sm text-green-400">APY: {(boardSpaces[players[currentPlayer].position].apy * 100).toFixed(1)}%</p>
                          {boardSpaces[players[currentPlayer].position].owner !== undefined ? (
                            <p className="text-sm text-gray-400 mt-2">
                              Owned by {players[boardSpaces[players[currentPlayer].position].owner].name}
                            </p>
                          ) : (
                            <button
                              onClick={() => {
                                const currentSpace = boardSpaces[players[currentPlayer].position];
                                buyProperty(players[currentPlayer].id, currentSpace);
                              }}
                              className={`w-full mt-2 py-2 rounded-lg font-bold text-sm transition-all ${
                                players[currentPlayer].money >= boardSpaces[players[currentPlayer].position].cost
                                  ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
                                  : 'bg-red-500 text-white opacity-50 cursor-not-allowed'
                              }`}
                              disabled={players[currentPlayer].money < boardSpaces[players[currentPlayer].position].cost}
                            >
                              {players[currentPlayer].money >= boardSpaces[players[currentPlayer].position].cost
                                ? `Buy ${boardSpaces[players[currentPlayer].position].name} (${boardSpaces[players[currentPlayer].position].cost} USDT)`
                                : `Need ${boardSpaces[players[currentPlayer].position].cost - players[currentPlayer].money} more USDT`}
                            </button>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-gray-400">Not available for purchase</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <div className="bg-gray-800 bg-opacity-50 backdrop-blur-lg rounded-xl p-3 text-white border border-gray-700">
              <h3 className="text-lg font-bold mb-2">Game Log</h3>
              <div className="max-h-40 overflow-y-auto space-y-1 text-xs scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
                {log.map((entry, idx) => (
                  <div key={idx} className="py-1 px-2 rounded-lg bg-gray-700 bg-opacity-50">
                    {entry.replace(/\$/g, 'USDT ')}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        {activeEffects.length > 0 && (
          <div className="fixed bottom-4 right-4">
            <div className="bg-gray-800 bg-opacity-50 backdrop-blur-lg rounded-xl p-3 text-white border border-gray-700">
              <h3 className="text-lg font-bold mb-2">Active Effects</h3>
              <div className="max-h-40 overflow-y-auto space-y-1 text-xs scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
                {activeEffects.map((effect, index) => (
                  <div
                    key={index}
                    className={`p-2 rounded-lg text-sm ${
                      effect.type === 'positive' ? 'bg-green-800' : 'bg-red-800'
                    }`}
                  >
                    {effect.title} ({effect.roundsLeft} rounds left)
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      {currentEvent && (
        <GameEvent event={currentEvent} onClose={handleEventEffect} />
      )}
    </ErrorBoundary>
  );
};
export default App;