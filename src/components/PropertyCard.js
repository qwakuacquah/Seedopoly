import React from 'react';

const PropertyCard = ({ property, onUpgrade, onSell }) => {
  if (!property) return null;

  const getBackgroundColor = () => {
    if (!property.type) return 'bg-gray-600';
    if (property.type.includes('Validator')) return 'bg-blue-600';
    if (property.type.includes('Farm')) return 'bg-green-600';
    if (property.type.includes('Bot')) return 'bg-purple-600';
    return 'bg-gray-600';
  };

  const calculateUpgradeCost = () => {
    return property.cost * 0.5;
  };

  return (
    <div className={`${getBackgroundColor()} rounded-lg p-4 text-white shadow-lg w-full max-w-sm`}>
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-bold">{property.name}</h3>
        <span className="text-lg font-semibold">${property.cost}</span>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between">
          <span>Current APY:</span>
          <span className="font-bold">{(property.apy * 100).toFixed(1)}%</span>
        </div>
        <div className="flex justify-between">
          <span>Daily Yield:</span>
          <span className="font-bold">${(property.cost * property.apy / 365).toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Level:</span>
          <span className="font-bold">{property.level || 1}</span>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <button
          onClick={() => onUpgrade(property)}
          className="w-full bg-white text-blue-600 py-2 rounded-md font-semibold hover:bg-gray-100 transition-colors"
        >
          Upgrade (${calculateUpgradeCost().toFixed(0)})
        </button>
        <button
          onClick={() => onSell(property)}
          className="w-full bg-red-500 text-white py-2 rounded-md font-semibold hover:bg-red-600 transition-colors"
        >
          Sell Property
        </button>
      </div>
    </div>
  );
};

export default PropertyCard; 