import React from 'react';

const GameStats = ({ players, currentPlayer, round }) => {
  const calculateNetWorth = (player) => {
    const propertyValue = player.properties.reduce((sum, prop) => sum + prop.price, 0);
    return player.money + propertyValue - player.debt;
  };

  const calculateTotalYield = (player) => {
    return player.properties.reduce((sum, prop) => {
      const dailyYield = (prop.price * prop.apy / 365);
      return sum + dailyYield;
    }, 0);
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 text-white">
      <h2 className="text-xl font-bold mb-4">Game Statistics</h2>
      <div className="space-y-4">
        <div className="text-sm">Round: {round}</div>
        
        {players.map((player, index) => (
          <div 
            key={index}
            className={`p-3 rounded-lg ${currentPlayer === index ? 'bg-blue-600' : 'bg-gray-700'}`}
          >
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold">Player {index + 1}</h3>
              <span className={currentPlayer === index ? 'animate-pulse' : ''}>
                {currentPlayer === index ? '🎲 Current Turn' : ''}
              </span>
            </div>
            
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Cash:</span>
                <span className="font-mono">${player.money.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Debt:</span>
                <span className="font-mono text-red-400">${player.debt.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Properties:</span>
                <span className="font-mono">{player.properties.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Daily Yield:</span>
                <span className="font-mono text-green-400">
                  ${calculateTotalYield(player).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between border-t border-gray-600 mt-2 pt-2">
                <span>Net Worth:</span>
                <span className="font-mono font-bold">
                  ${calculateNetWorth(player).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GameStats; 