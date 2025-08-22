import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

function MarketOverview() {
  const [marketData, setMarketData] = useState(null);
  const [topGainers, setTopGainers] = useState([]);
  const [topLosers, setTopLosers] = useState([]);
  const [marketBreadth, setMarketBreadth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchMarketData = async () => {
    try {
      console.log('Fetching market data...');
      const response = await fetch(`${API_BASE}/api/market-overview`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Market data received:', data);
      
      if (data.indices) {
        setMarketData(data.indices);
      }
      if (data.topGainers) {
        setTopGainers(data.topGainers);
      }
      if (data.topLosers) {
        setTopLosers(data.topLosers);
      }
      if (data.marketBreadth) {
        setMarketBreadth(data.marketBreadth);
      }
      if (data.lastUpdated) {
        setLastUpdated(new Date(data.lastUpdated).toLocaleTimeString());
      }
      
      setError(null);
      setError(null);
    } catch (error) {
      console.error("Failed to fetch market data:", error);
      setError(error.message);
      
      // Set fallback data if API fails
      setMarketData({
        nifty50: { price: 25083.75, change: 33.2, changePercent: 0.13 },
        sensex: { price: 82000.71, change: 142.87, changePercent: 0.17 },
        bankNifty: { price: 55755.45, change: 56.95, changePercent: 0.10 },
        niftyIT: { price: 44200.30, change: -15.20, changePercent: -0.03 }
      });
      setMarketBreadth({ advancing: 1750, declining: 1350, unchanged: 250 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch data immediately
    fetchMarketData();
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(fetchMarketData, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Market Overview</h1>
          <div className="flex items-center space-x-4">
            {error && (
              <span className="text-sm text-red-500">
                Error: {error}
              </span>
            )}
            {lastUpdated && (
              <span className="text-sm text-gray-500">
                Last updated: {lastUpdated}
              </span>
            )}
            <button
              onClick={fetchMarketData}
              disabled={loading}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                loading 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
        
        {/* Loading State */}
        {loading && !marketData && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading market data...</p>
          </div>
        )}
        
        {/* Market Indices */}
        {marketData && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {Object.entries(marketData).map(([key, data]) => (
              <div key={key} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <h3 className="text-lg font-semibold text-gray-800 uppercase mb-2">{key.replace(/([A-Z])/g, ' $1').trim()}</h3>
                <p className="text-2xl font-bold text-gray-900">{data.price?.toLocaleString() || '0'}</p>
                <p className={`text-sm ${data.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {data.change >= 0 ? '+' : ''}{data.change} ({data.changePercent >= 0 ? '+' : ''}{data.changePercent}%)
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Top Gainers and Losers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Top Gainers */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Top Gainers</h2>
            <div className="space-y-3">
              {topGainers.map((stock, index) => (
                <div key={stock.symbol} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                  <div>
                    <p className="font-semibold text-gray-800">{stock.symbol}</p>
                    <p className="text-sm text-gray-600">₹{stock.price.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-green-600 font-semibold">+{stock.change}</p>
                    <p className="text-sm text-green-600">+{stock.changePercent}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Losers */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Top Losers</h2>
            <div className="space-y-3">
              {topLosers.map((stock, index) => (
                <div key={stock.symbol} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                  <div>
                    <p className="font-semibold text-gray-800">{stock.symbol}</p>
                    <p className="text-sm text-gray-600">₹{stock.price.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-red-600 font-semibold">{stock.change}</p>
                    <p className="text-sm text-red-600">{stock.changePercent}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Market Summary */}
        {marketBreadth && (
          <div className="bg-white rounded-lg shadow-md p-6 mt-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Market Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">{marketBreadth.advancing?.toLocaleString() || '0'}</p>
                <p className="text-sm text-gray-600">Advances</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-red-600">{marketBreadth.declining?.toLocaleString() || '0'}</p>
                <p className="text-sm text-gray-600">Declines</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-gray-600">{marketBreadth.unchanged?.toLocaleString() || '0'}</p>
                <p className="text-sm text-gray-600">Unchanged</p>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default MarketOverview;
