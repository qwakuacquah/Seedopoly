import React, { useState } from 'react';

const TradeModal = ({ players, currentPlayer, onTrade, onClose }) => {
  const [selectedProperties, setSelectedProperties] = useState({
    offer: [],
    request: []
  });
  const [cashOffer, setCashOffer] = useState(0);
  
  const otherPlayer = currentPlayer === 0 ? 1 : 0;
  
  const handleTrade = () => {
    onTrade({
      fromPlayer: currentPlayer,
      toPlayer: otherPlayer,
      offeredProperties: selectedProperties.offer,
      requestedProperties: selectedProperties.request,
      cashOffer
    });
    onClose();
  };
  
  const toggleProperty = (property, type) => {
    setSelectedProperties(prev => ({
      ...prev,
      [type]: prev[type].includes(property)
        ? prev[type].filter(p => p.name !== property.name)
        : [...prev[type], property]
    }));
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg p-6 max-w-4xl w-full">
        <h2 className="text-2xl font-bold mb-6 text-white">Propose Trade</h2>
        
        <div className="grid grid-cols-2 gap-8">
          {/* Your Offer */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-green-400">Your Offer</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-2">Cash Offer</label>
                <input
                  type="number"
                  value={cashOffer}
                  onChange={(e) => setCashOffer(Number(e.target.value))}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-md"
                  min="0"
                  max={players[currentPlayer].money}
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-300 mb-2">Your Properties</label>
                <div className="space-y-2">
                  {players[currentPlayer].properties.map((property, idx) => (
                    <div
                      key={idx}
                      onClick={() => toggleProperty(property, 'offer')}
                      className={`p-3 rounded-md cursor-pointer transition-colors ${
                        selectedProperties.offer.includes(property)
                          ? 'bg-green-600'
                          : 'bg-gray-700 hover:bg-gray-600'
                      }`}
                    >
                      <div className="font-medium">{property.name}</div>
                      <div className="text-sm text-gray-300">
                        APY: {property.apy}% | Value: ${property.price}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          {/* Their Properties */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-blue-400">Request</h3>
            <div className="space-y-2">
              {players[otherPlayer].properties.map((property, idx) => (
                <div
                  key={idx}
                  onClick={() => toggleProperty(property, 'request')}
                  className={`p-3 rounded-md cursor-pointer transition-colors ${
                    selectedProperties.request.includes(property)
                      ? 'bg-blue-600'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  <div className="font-medium">{property.name}</div>
                  <div className="text-sm text-gray-300">
                    APY: {property.apy}% | Value: ${property.price}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="mt-8 flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleTrade}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            disabled={
              selectedProperties.offer.length === 0 &&
              selectedProperties.request.length === 0 &&
              cashOffer === 0
            }
          >
            Propose Trade
          </button>
        </div>
      </div>
    </div>
  );
};

export default TradeModal; 