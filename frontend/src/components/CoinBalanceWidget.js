import React, { useState, useEffect } from 'react';
import { Coins } from 'lucide-react';
import axios from 'axios';

const CoinBalanceWidget = ({ language = 'en' }) => {
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    fetchBalance();
  }, []);

  const fetchBalance = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/coins/balance`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      setBalance(response.data.balance);
    } catch (error) {
      console.error('Error fetching coin balance:', error);
    }
  };

  return (
    <div className="flex items-center space-x-2 bg-yellow-50 px-3 py-2 rounded-lg border border-yellow-200">
      <Coins className="w-5 h-5 text-yellow-600" />
      <span className="text-sm font-semibold text-yellow-800">{balance}</span>
    </div>
  );
};

export default CoinBalanceWidget;
