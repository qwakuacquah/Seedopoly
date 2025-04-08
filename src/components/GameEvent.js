import React from 'react';

export const events = [
  {
    id: 'market_boom',
    title: 'Market Boom! 📈',
    description: 'Property yields increase by 20% for 2 rounds',
    type: 'positive',
    duration: 2,
    effect: (players) => players.map(p => ({
      ...p,
      properties: p.properties.map(prop => ({ 
        ...prop, 
        apy: prop.apy * 1.2,
        originalApy: prop.apy 
      }))
    })),
    reverseEffect: (players) => players.map(p => ({
      ...p,
      properties: p.properties.map(prop => ({ 
        ...prop, 
        apy: prop.originalApy || prop.apy 
      }))
    }))
  },
  {
    id: 'market_crash',
    title: 'Market Crash! 📉',
    description: 'Property yields decrease by 30% for 2 rounds',
    type: 'negative',
    duration: 2,
    effect: (players) => players.map(p => ({
      ...p,
      properties: p.properties.map(prop => ({ 
        ...prop, 
        apy: prop.apy * 0.7,
        originalApy: prop.apy 
      }))
    })),
    reverseEffect: (players) => players.map(p => ({
      ...p,
      properties: p.properties.map(prop => ({ 
        ...prop, 
        apy: prop.originalApy || prop.apy 
      }))
    }))
  },
  {
    id: 'network_upgrade',
    title: 'Network Upgrade 🔄',
    description: 'A major network upgrade has increased validator rewards! Validator APYs increase by 25%.',
    type: 'positive',
    effect: (players) => {
      return players.map(player => ({
        ...player,
        properties: player.properties.map(prop => ({
          ...prop,
          apy: prop.type.includes('Validator') ? prop.apy * 1.25 : prop.apy
        }))
      }));
    }
  },
  {
    id: 'hack',
    title: 'Security Breach! 🚨',
    description: 'A hack has been detected! All players must pay 10% of their cash for security upgrades.',
    type: 'negative',
    effect: (players) => {
      return players.map(player => ({
        ...player,
        money: player.money * 0.9
      }));
    }
  }
];

const GameEvent = ({ event, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className={`bg-gray-800 rounded-lg p-6 max-w-md w-full border-2 ${
        event.type === 'positive' ? 'border-green-500' : 'border-red-500'
      }`}>
        <h2 className="text-2xl font-bold mb-4 text-white">{event.title}</h2>
        <p className="text-gray-300 mb-6">{event.description}</p>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg ${
              event.type === 'positive' 
                ? 'bg-green-600 hover:bg-green-700' 
                : 'bg-red-600 hover:bg-red-700'
            } text-white transition-colors`}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameEvent; 