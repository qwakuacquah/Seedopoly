import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import App from './App';

// Mock the random number generator for consistent dice rolls
const mockMath = Object.create(global.Math);
mockMath.random = () => 0.5; // This will always return 3 for dice rolls
global.Math = mockMath;

describe('Seedopoly Game', () => {
  beforeEach(() => {
    render(<App />);
  });

  test('initial game state is correct', () => {
    // Check initial player states
    expect(screen.getByText('You')).toBeInTheDocument();
    expect(screen.getByText('2000 USDT')).toBeInTheDocument();
    expect(screen.getByText('5000 USDT debt')).toBeInTheDocument();
    
    // Check initial board state
    expect(screen.getByText('Start')).toBeInTheDocument();
    expect(screen.getByText('Basic Validator 1')).toBeInTheDocument();
  });

  test('dice roll moves player correctly', () => {
    const rollButton = screen.getByText('Roll Dice');
    fireEvent.click(rollButton);
    
    // Player should move 3 spaces (mock dice roll)
    expect(screen.getByText('Market Dip')).toBeInTheDocument();
  });

  test('property purchase works correctly', () => {
    // Move to a property space
    const rollButton = screen.getByText('Roll Dice');
    fireEvent.click(rollButton);
    
    // Check if purchase option appears
    const buyButton = screen.getByText(/Buy Basic Validator 1/i);
    expect(buyButton).toBeInTheDocument();
    
    // Purchase the property
    fireEvent.click(buyButton);
    
    // Check if property is owned
    expect(screen.getByText('Owned by You')).toBeInTheDocument();
    expect(screen.getByText('1500 USDT')).toBeInTheDocument(); // Money should be reduced
  });

  test('rent payment works correctly', () => {
    // First player buys a property
    const rollButton = screen.getByText('Roll Dice');
    fireEvent.click(rollButton);
    fireEvent.click(screen.getByText(/Buy Basic Validator 1/i));
    
    // Switch to bot's turn
    fireEvent.click(screen.getByText('Skip Purchase'));
    
    // Bot should pay rent when landing on owned property
    expect(screen.getByText(/paid rent/i)).toBeInTheDocument();
  });

  test('debt payment works correctly', () => {
    const payDebtButton = screen.getByText('Pay 200 USDT');
    fireEvent.click(payDebtButton);
    
    expect(screen.getByText('4800 USDT debt')).toBeInTheDocument();
    expect(screen.getByText('1800 USDT')).toBeInTheDocument();
  });

  test('game over conditions work correctly', () => {
    // Simulate reaching max debt
    const player = screen.getByText('You').closest('.player-stats');
    const debtText = player.querySelector('.debt');
    expect(debtText).toHaveTextContent('5000 USDT debt');
    
    // Add more debt to trigger game over
    const rollButton = screen.getByText('Roll Dice');
    for (let i = 0; i < 10; i++) {
      fireEvent.click(rollButton);
    }
    
    expect(screen.getByText('Game Over!')).toBeInTheDocument();
  });

  test('error boundary catches errors', () => {
    // Force an error
    const errorButton = screen.getByText('Force Error');
    fireEvent.click(errorButton);
    
    expect(screen.getByText('Something went wrong!')).toBeInTheDocument();
  });
});
