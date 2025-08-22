import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

function MarketSentiment() {
  const [sentimentData, setSentimentData] = useState({
    overall: { score: 0, label: "Loading...", color: "text-gray-600" },
    fear_greed: { score: 0, label: "Loading...", color: "text-gray-600" },
    volatility: { score: 0, label: "Loading...", color: "text-gray-600" }
  });

  const [newsHeadlines, setNewsHeadlines] = useState([]);

  const [sectorSentiment, setSectorSentiment] = useState([]);

  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchSentimentData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/market-sentiment`);
      if (response.ok) {
        const data = await response.json();
        
        if (data.overall) {
          setSentimentData({
            overall: data.overall,
            fear_greed: data.fear_greed,
            volatility: data.volatility
          });
        }
        if (data.sectors) {
          setSectorSentiment(data.sectors);
        }
        if (data.news) {
          setNewsHeadlines(data.news);
        }
        if (data.lastUpdated) {
          setLastUpdated(new Date(data.lastUpdated).toLocaleTimeString());
        }
      }
    } catch (error) {
      console.error("Failed to fetch sentiment data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch data immediately
    fetchSentimentData();
    
    // Set up auto-refresh every 60 seconds
    const interval = setInterval(fetchSentimentData, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const getSentimentColor = (score) => {
    if (score >= 70) return "text-green-600";
    if (score >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const getSentimentBg = (score) => {
    if (score >= 70) return "bg-green-100";
    if (score >= 50) return "bg-yellow-100";
    return "bg-red-100";
  };

  const getTrendIcon = (trend) => {
    switch(trend) {
      case "up": return "↗️";
      case "down": return "↘️";
      default: return "→";
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
          <h1 className="text-3xl font-bold text-gray-900">Market Sentiment Analysis</h1>
          <div className="flex items-center space-x-4">
            {lastUpdated && (
              <span className="text-sm text-gray-500">
                Last updated: {lastUpdated}
              </span>
            )}
            <button
              onClick={fetchSentimentData}
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
        
        {/* Overall Sentiment Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Market Sentiment</h3>
            <div className="relative w-24 h-24 mx-auto mb-4">
              <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 36 36">
                <path
                  d="M18 2.0845 A 15.9155 15.9155 0 0 1 18 33.9155"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="2"
                />
                <path
                  d="M18 2.0845 A 15.9155 15.9155 0 0 1 18 33.9155"
                  fill="none"
                  stroke={sentimentData.overall.score >= 70 ? "#10b981" : sentimentData.overall.score >= 50 ? "#f59e0b" : "#ef4444"}
                  strokeWidth="2"
                  strokeDasharray={`${sentimentData.overall.score}, 100`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold">{sentimentData.overall.score}</span>
              </div>
            </div>
            <p className={`font-semibold ${sentimentData.overall.color}`}>{sentimentData.overall.label}</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Fear & Greed Index</h3>
            <div className="relative w-24 h-24 mx-auto mb-4">
              <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 36 36">
                <path
                  d="M18 2.0845 A 15.9155 15.9155 0 0 1 18 33.9155"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="2"
                />
                <path
                  d="M18 2.0845 A 15.9155 15.9155 0 0 1 18 33.9155"
                  fill="none"
                  stroke={sentimentData.fear_greed.score >= 70 ? "#f59e0b" : sentimentData.fear_greed.score >= 50 ? "#10b981" : "#ef4444"}
                  strokeWidth="2"
                  strokeDasharray={`${sentimentData.fear_greed.score}, 100`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold">{sentimentData.fear_greed.score}</span>
              </div>
            </div>
            <p className={`font-semibold ${sentimentData.fear_greed.color}`}>{sentimentData.fear_greed.label}</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Market Volatility</h3>
            <div className="relative w-24 h-24 mx-auto mb-4">
              <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 36 36">
                <path
                  d="M18 2.0845 A 15.9155 15.9155 0 0 1 18 33.9155"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="2"
                />
                <path
                  d="M18 2.0845 A 15.9155 15.9155 0 0 1 18 33.9155"
                  fill="none"
                  stroke={sentimentData.volatility.score <= 30 ? "#10b981" : sentimentData.volatility.score <= 60 ? "#f59e0b" : "#ef4444"}
                  strokeWidth="2"
                  strokeDasharray={`${sentimentData.volatility.score}, 100`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold">{sentimentData.volatility.score}</span>
              </div>
            </div>
            <p className={`font-semibold ${sentimentData.volatility.color}`}>{sentimentData.volatility.label}</p>
          </div>
        </div>

        {/* Sector Sentiment */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Sector Sentiment</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sectorSentiment.map((sector, index) => (
              <div key={sector.sector} className={`p-4 rounded-lg ${getSentimentBg(sector.sentiment)}`}>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-800">{sector.sector}</span>
                  <span className="text-lg">{getTrendIcon(sector.trend)}</span>
                </div>
                <div className="mt-2">
                  <span className={`text-2xl font-bold ${getSentimentColor(sector.sentiment)}`}>
                    {sector.sentiment}
                  </span>
                  <span className="text-sm text-gray-600 ml-1">/ 100</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* News Sentiment */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">News Sentiment Analysis</h2>
          <div className="space-y-4">
            {newsHeadlines.map((news, index) => (
              <div key={index} className="flex justify-between items-center p-4 border border-gray-200 rounded-lg">
                <div className="flex-1">
                  <p className="text-gray-800 font-medium">{news.title}</p>
                </div>
                <div className="ml-4 text-right">
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                    news.sentiment === 'positive' ? 'bg-green-100 text-green-800' :
                    news.sentiment === 'negative' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {news.sentiment}
                  </span>
                  <p className={`text-sm mt-1 ${getSentimentColor(news.score)}`}>
                    {news.score}/100
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default MarketSentiment;
