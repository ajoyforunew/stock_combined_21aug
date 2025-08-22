import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

function TechnicalAnalysis() {
  const [selectedStock, setSelectedStock] = useState("RELIANCE");
  const [technicalData, setTechnicalData] = useState({
    currentPrice: 0,
    technicalIndicators: {
      rsi: 0,
      ma20: 0,
      ma50: 0,
      ma200: 0,
      macd: null
    },
    supportResistance: {
      support: 0,
      resistance: 0
    },
    bollingerBands: null,
    volume: 0
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

  const getMacdSignal = (macdData) => {
    if (!macdData || !macdData.macd || !macdData.signal) return { signal: "N/A", color: "text-gray-600", bg: "bg-gray-100" };
    
    if (macdData.macd > macdData.signal) {
      return { signal: "Bullish", color: "text-green-600", bg: "bg-green-100" };
    } else {
      return { signal: "Bearish", color: "text-red-600", bg: "bg-red-100" };
    }
  };

  const getBollingerSignal = (bollingerBands) => {
    if (!bollingerBands || !bollingerBands.upper || !bollingerBands.lower || !technicalData.currentPrice) {
      return { 
        signal: "Loading...", 
        color: "text-gray-600",
        bg: "bg-gray-50",
        border: "border-gray-200",
        description: "Calculating position..."
      };
    }
    
    const currentPrice = technicalData.currentPrice;
    const position = (currentPrice - bollingerBands.lower) / (bollingerBands.upper - bollingerBands.lower);
    
    if (position > 0.8) {
      return { 
        signal: "Overbought", 
        color: "text-red-700 bg-red-100",
        bg: "bg-red-50",
        border: "border-red-300",
        description: "Price is near upper band, potential resistance level"
      };
    } else if (position < 0.2) {
      return { 
        signal: "Oversold", 
        color: "text-green-700 bg-green-100",
        bg: "bg-green-50",
        border: "border-green-300",
        description: "Price is near lower band, potential support level"
      };
    } else {
      return { 
        signal: "Normal Range", 
        color: "text-blue-700 bg-blue-100",
        bg: "bg-blue-50",
        border: "border-blue-300",
        description: "Price is within normal trading range"
      };
    }
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
                
                {/* MACD */}
                {technicalData.technicalIndicators?.macd ? (
                  <div className={`p-4 rounded-lg ${getMacdSignal(technicalData.technicalIndicators.macd).bg}`}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold text-gray-800">MACD</span>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${getMacdSignal(technicalData.technicalIndicators.macd).color}`}>
                        {getMacdSignal(technicalData.technicalIndicators.macd).signal}
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{technicalData.technicalIndicators.macd.macd?.toFixed(2)}</p>
                    <p className="text-sm text-gray-600">Signal: {technicalData.technicalIndicators.macd.signal?.toFixed(2)}</p>
                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-gray-100">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold text-gray-800">MACD</span>
                      <span className="px-2 py-1 rounded text-xs font-semibold text-gray-600">
                        Loading...
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">-</p>
                  </div>
                )}
                
                {/* Stochastic - Placeholder for future implementation */}
                <div className="p-4 rounded-lg bg-gray-100">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-gray-800">Stochastic</span>
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

        {/* Bollinger Bands */}
        {technicalData.bollingerBands && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Bollinger Bands</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="text-center p-4 rounded-lg bg-blue-50 border border-blue-200">
                <h3 className="text-lg font-semibold text-blue-800 mb-2">Upper Band</h3>
                <p className="text-2xl font-bold text-blue-600">
                  ₹{technicalData.bollingerBands.upper?.toFixed(2)}
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  +{technicalData.currentPrice && technicalData.bollingerBands.upper ? 
                    ((technicalData.bollingerBands.upper - technicalData.currentPrice) / technicalData.currentPrice * 100).toFixed(2) : 0}%
                </p>
              </div>
              <div className="text-center p-4 rounded-lg bg-gray-50 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Middle Band (SMA)</h3>
                <p className="text-2xl font-bold text-gray-600">
                  ₹{technicalData.bollingerBands.middle?.toFixed(2)}
                </p>
                <p className="text-sm text-gray-700 mt-1">
                  20-period average
                </p>
              </div>
              <div className="text-center p-4 rounded-lg bg-orange-50 border border-orange-200">
                <h3 className="text-lg font-semibold text-orange-800 mb-2">Lower Band</h3>
                <p className="text-2xl font-bold text-orange-600">
                  ₹{technicalData.bollingerBands.lower?.toFixed(2)}
                </p>
                <p className="text-sm text-orange-700 mt-1">
                  {technicalData.currentPrice && technicalData.bollingerBands.lower ? 
                    ((technicalData.currentPrice - technicalData.bollingerBands.lower) / technicalData.bollingerBands.lower * 100).toFixed(2) : 0}%
                </p>
              </div>
            </div>
            
            {/* Bollinger Bands Signal */}
            <div className={`p-4 rounded-lg border-2 ${getBollingerSignal(technicalData.bollingerBands).bg} ${getBollingerSignal(technicalData.bollingerBands).border}`}>
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold text-gray-800">Position Analysis</span>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getBollingerSignal(technicalData.bollingerBands).color}`}>
                  {getBollingerSignal(technicalData.bollingerBands).signal}
                </span>
              </div>
              <p className="text-lg font-semibold text-gray-900">
                Current Price: ₹{technicalData.currentPrice?.toFixed(2)}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {getBollingerSignal(technicalData.bollingerBands).description}
              </p>
            </div>
          </div>
        )}

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
