import React from 'react';

const BuyPropertyModal = ({ property, onBuy, onDecline }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4 text-white">Buy Property?</h2>
        <div className="space-y-4 text-white">
          <div className="bg-green-900 p-4 rounded-lg">
            <h3 className="font-bold text-lg mb-2">{property.name}</h3>
            <div className="space-y-2">
              <p className="text-sm">Price: ${property.cost}</p>
              <p className="text-sm">APY: {(property.apy * 100).toFixed(1)}%</p>
              <p className="text-sm">Daily Yield: ${(property.cost * property.apy / 365).toFixed(2)}</p>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end space-x-4">
            <button
              onClick={onDecline}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Decline
            </button>
            <button
              onClick={onBuy}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Buy Property
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BuyPropertyModal; 