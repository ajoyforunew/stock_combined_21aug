import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

function TechnicalAnalysis() {
  const [selectedStock, setSelectedStock] = useState("RELIANCE");
  const [technicalData, setTechnicalData] = useState({
    currentPrice: 2845.50,
    technicalIndicators: {
      rsi: 68.5,
      ma20: 2820.5,
      ma50: 2795.8,
      ma200: 2650.2,
      macd: null
    },
    supportResistance: {
      support: 2800.0,
      resistance: 2900.0
    },
    bollingerBands: null,
    volume: 1250000
  });

  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState("");

  const popularStocks = [
    "RELIANCE", "TCS", "INFY", "HDFC", "HDFCBANK", "ICICIBANK", "SBIN", 
    "BHARTIARTL", "ITC", "KOTAKBANK", "LT", "ASIANPAINT", "AXISBANK", 
    "MARUTI", "BAJFINANCE", "HCLTECH", "WIPRO", "ULTRACEMCO", "TITAN", "SUNPHARMA"
  ];

  const fetchTechnicalAnalysis = async (symbol = selectedStock) => {
    setLoading(true);
    setError("");
    
    try {
      const response = await fetch(`${API_BASE}/api/technical-analysis/${symbol}`);
      if (response.ok) {
        const data = await response.json();
        setTechnicalData({
          currentPrice: data.currentPrice,
          technicalIndicators: data.technicalIndicators,
          supportResistance: data.supportResistance,
          bollingerBands: data.bollingerBands,
          volume: data.volume
        });
        if (data.lastUpdated) {
          setLastUpdated(new Date(data.lastUpdated).toLocaleTimeString());
        }
      } else {
        const errorData = await response.json();
        setError(errorData.detail || "Failed to fetch technical analysis");
      }
    } catch (error) {
      console.error("Failed to fetch technical analysis:", error);
      setError("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  };

  const handleStockChange = (e) => {
    const newStock = e.target.value;
    setSelectedStock(newStock);
    fetchTechnicalAnalysis(newStock);
  };

  useEffect(() => {
    // Fetch data immediately
    fetchTechnicalAnalysis();
    
    // Set up auto-refresh every 2 minutes
    const interval = setInterval(() => fetchTechnicalAnalysis(), 120000);
    
    return () => clearInterval(interval);
  }, []);

  // Calculate additional indicators based on live data
  const calculateIndicatorSignal = (indicator, value) => {
    switch(indicator) {
      case 'rsi':
        if (value > 70) return { signal: "Overbought", color: "text-red-600", bg: "bg-red-100" };
        if (value < 30) return { signal: "Oversold", color: "text-green-600", bg: "bg-green-100" };
        return { signal: "Neutral", color: "text-yellow-600", bg: "bg-yellow-100" };
      default:
        return { signal: "Neutral", color: "text-gray-600", bg: "bg-gray-100" };
    }
  };

  const getMaSignal = (price, ma) => {
    return price > ma ? { signal: "Above", color: "text-green-600" } : { signal: "Below", color: "text-red-600" };
  };

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Technical Analysis</h1>
          <div className="flex items-center space-x-4">
            {lastUpdated && (
              <span className="text-sm text-gray-500">
                Last updated: {lastUpdated}
              </span>
            )}
            <button
              onClick={() => fetchTechnicalAnalysis()}
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
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}
        
        {/* Stock Selector */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Select Stock for Analysis</h2>
          <select 
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={selectedStock}
            onChange={handleStockChange}
            disabled={loading}
          >
            {popularStocks.map(stock => (
              <option key={stock} value={stock}>{stock}</option>
            ))}
          </select>
        </div>

        {/* Price & Key Levels */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Current Price</h3>
            <p className="text-3xl font-bold text-blue-600">₹{technicalData.currentPrice?.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Support</h3>
            <p className="text-3xl font-bold text-green-600">₹{technicalData.supportResistance?.support?.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Resistance</h3>
            <p className="text-3xl font-bold text-red-600">₹{technicalData.supportResistance?.resistance?.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Volume</h3>
            <p className="text-3xl font-bold text-purple-600">{(technicalData.volume / 1000000)?.toFixed(2)}M</p>
          </div>
        </div>

        {/* Technical Indicators */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Technical Indicators</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {technicalData.technicalIndicators && (
              <>
                {/* RSI */}
                <div className={`p-4 rounded-lg ${calculateIndicatorSignal('rsi', technicalData.technicalIndicators.rsi).bg}`}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-gray-800">RSI (14)</span>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${calculateIndicatorSignal('rsi', technicalData.technicalIndicators.rsi).color}`}>
                      {calculateIndicatorSignal('rsi', technicalData.technicalIndicators.rsi).signal}
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{technicalData.technicalIndicators.rsi?.toFixed(1)}</p>
                </div>
                
                {/* MACD - Placeholder for future implementation */}
                <div className="p-4 rounded-lg bg-gray-100">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-gray-800">MACD</span>
                    <span className="px-2 py-1 rounded text-xs font-semibold text-gray-600">
                      Coming Soon
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">-</p>
                </div>
                
                {/* More indicators can be added here */}
                <div className="p-4 rounded-lg bg-gray-100">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-gray-800">Bollinger Bands</span>
                    <span className="px-2 py-1 rounded text-xs font-semibold text-gray-600">
                      Coming Soon
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">-</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Moving Averages */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Moving Averages</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {technicalData.technicalIndicators && (
              <>
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">MA 20</h3>
                  <p className="text-2xl font-bold text-blue-600">₹{technicalData.technicalIndicators.ma20?.toFixed(2)}</p>
                  <p className={`text-sm ${getMaSignal(technicalData.currentPrice, technicalData.technicalIndicators.ma20).color}`}>
                    {getMaSignal(technicalData.currentPrice, technicalData.technicalIndicators.ma20).signal} MA20
                  </p>
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">MA 50</h3>
                  <p className="text-2xl font-bold text-purple-600">₹{technicalData.technicalIndicators.ma50?.toFixed(2)}</p>
                  <p className={`text-sm ${getMaSignal(technicalData.currentPrice, technicalData.technicalIndicators.ma50).color}`}>
                    {getMaSignal(technicalData.currentPrice, technicalData.technicalIndicators.ma50).signal} MA50
                  </p>
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">MA 200</h3>
                  <p className="text-2xl font-bold text-orange-600">
                    {technicalData.technicalIndicators.ma200 ? `₹${technicalData.technicalIndicators.ma200.toFixed(2)}` : 'N/A'}
                  </p>
                  {technicalData.technicalIndicators.ma200 && (
                    <p className={`text-sm ${getMaSignal(technicalData.currentPrice, technicalData.technicalIndicators.ma200).color}`}>
                      {getMaSignal(technicalData.currentPrice, technicalData.technicalIndicators.ma200).signal} MA200
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Support & Resistance Analysis */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Support & Resistance Analysis</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 border border-green-200 rounded-lg bg-green-50">
              <h3 className="text-lg font-semibold text-green-800 mb-2">Support Level</h3>
              <p className="text-2xl font-bold text-green-600">₹{technicalData.supportResistance?.support?.toLocaleString()}</p>
              <p className="text-sm text-green-700 mt-1">
                Distance: {technicalData.currentPrice && technicalData.supportResistance?.support ? 
                  ((technicalData.currentPrice - technicalData.supportResistance.support) / technicalData.supportResistance.support * 100).toFixed(2) : 0}%
              </p>
            </div>
            <div className="p-4 border border-red-200 rounded-lg bg-red-50">
              <h3 className="text-lg font-semibold text-red-800 mb-2">Resistance Level</h3>
              <p className="text-2xl font-bold text-red-600">₹{technicalData.supportResistance?.resistance?.toLocaleString()}</p>
              <p className="text-sm text-red-700 mt-1">
                Distance: {technicalData.currentPrice && technicalData.supportResistance?.resistance ? 
                  ((technicalData.supportResistance.resistance - technicalData.currentPrice) / technicalData.currentPrice * 100).toFixed(2) : 0}%
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default TechnicalAnalysis;
