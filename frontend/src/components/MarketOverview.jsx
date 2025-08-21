import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

function MarketOverview() {
  const [marketData, setMarketData] = useState({
    nifty50: { price: 24936.40, change: 142.75, changePercent: 0.58 },
    sensex: { price: 81867.55, change: 378.30, changePercent: 0.46 },
    bankNifty: { price: 51432.85, change: -89.45, changePercent: -0.17 },
    niftyIT: { price: 42863.20, change: 215.85, changePercent: 0.51 }
  });

  const [topGainers, setTopGainers] = useState([
    { symbol: "ADANIPORTS", price: 1285.75, change: 68.20, changePercent: 5.60 },
    { symbol: "TATAMOTORS", price: 952.40, change: 45.85, changePercent: 5.06 },
    { symbol: "HINDALCO", price: 648.25, change: 28.90, changePercent: 4.67 },
    { symbol: "JSWSTEEL", price: 862.10, change: 32.55, changePercent: 3.92 },
    { symbol: "COALINDIA", price: 485.60, change: 17.25, changePercent: 3.68 }
  ]);

  const [topLosers, setTopLosers] = useState([
    { symbol: "BAJFINANCE", price: 6542.30, change: -185.70, changePercent: -2.76 },
    { symbol: "HDFCLIFE", price: 635.85, change: -16.45, changePercent: -2.52 },
    { symbol: "ASIANPAINT", price: 2892.40, change: -68.25, changePercent: -2.31 },
    { symbol: "BRITANNIA", price: 4785.60, change: -105.40, changePercent: -2.15 },
    { symbol: "NESTLEIND", price: 2163.75, change: -44.85, changePercent: -2.03 }
  ]);

  const [marketBreadth, setMarketBreadth] = useState({
    advances: 1832,
    declines: 1468,
    unchanged: 234
  });

  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchMarketData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/market-overview`);
      if (response.ok) {
        const data = await response.json();
        
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
      }
    } catch (error) {
      console.error("Failed to fetch market data:", error);
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
        
        {/* Market Indices */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {Object.entries(marketData).map(([key, data]) => (
            <div key={key} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <h3 className="text-lg font-semibold text-gray-800 uppercase mb-2">{key.replace(/([A-Z])/g, ' $1').trim()}</h3>
              <p className="text-2xl font-bold text-gray-900">{data.price.toLocaleString()}</p>
              <p className={`text-sm ${data.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {data.change >= 0 ? '+' : ''}{data.change} ({data.changePercent >= 0 ? '+' : ''}{data.changePercent}%)
              </p>
            </div>
          ))}
        </div>

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
        <div className="bg-white rounded-lg shadow-md p-6 mt-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Market Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">{marketBreadth.advances.toLocaleString()}</p>
              <p className="text-sm text-gray-600">Advances</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-red-600">{marketBreadth.declines.toLocaleString()}</p>
              <p className="text-sm text-gray-600">Declines</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-600">{marketBreadth.unchanged.toLocaleString()}</p>
              <p className="text-sm text-gray-600">Unchanged</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default MarketOverview;
