import React, { useState } from "react";
import Logo from "./assets/logo.svg";
import { motion } from "framer-motion";
import AdminPanel from "./components/AdminPanel";
import SearchBar from "./components/SearchBar";
import StockChart from "./components/StockChart";
import Login from "./components/Login";
import Portfolio from "./components/Portfolio";
import PortfolioFixed from "./components/PortfolioFixed";
import UserProfile from "./components/UserProfile";
import MarketOverview from "./components/MarketOverview";
import MarketSentiment from "./components/MarketSentiment";
import TechnicalAnalysis from "./components/TechnicalAnalysis";

// Helper to convert forecast array to Chart.js data format
function forecastToChartData(forecast) {
  if (!Array.isArray(forecast) || forecast.length === 0) return { labels: [], datasets: [] };
  const labels = forecast.map(row => row.date);
  const closeData = forecast.map(row => row.predicted_close ? Number(row.predicted_close) : null);
  const volumeData = forecast.map(row => row.predicted_volume ? Number(row.predicted_volume) : null);
  return {
    labels,
    datasets: [
      {
        label: "Predicted Close",
        data: closeData,
        borderColor: "#2563eb",
        backgroundColor: "rgba(37,99,235,0.1)",
        yAxisID: 'y',
      },
      {
        label: "Predicted Volume",
        data: volumeData,
        borderColor: "#f59e42",
        backgroundColor: "rgba(245,158,66,0.1)",
        yAxisID: 'y1',
      }
    ]
  };
}
import ForecastTable from "./components/ForecastTable";
import "./index.css";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";


export default function App() {
  const [ticker, setTicker] = useState("");
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [showPortfolio, setShowPortfolio] = useState(false);
  const [view, setView] = useState("market-overview"); // market-overview, main, portfolio, profile, sentiment, technical

  // Validate token on mount
  React.useEffect(() => {
    const t = localStorage.getItem("token");
    if (!t) return;
    fetch(API_BASE + "/me", {
      headers: { Authorization: `Bearer ${t}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data && data.user) {
          setIsLoggedIn(true);
          setIsAdmin(!!data.is_admin);
          setToken(t);
        } else {
          setIsLoggedIn(false);
          setIsAdmin(false);
        }
      })
      .catch(() => {
        setIsLoggedIn(false);
        setIsAdmin(false);
      });
  }, []);

async function fetchPrediction(symbol, futureDays = 30) {
  setError("");
  setForecast([]);
  if (!symbol) {
    setError("Please enter a ticker symbol.");
    return;
  }

  setLoading(true);
  try {
    // Corrected query parameter names to match FastAPI backend
    const url = `${API_BASE}/predict?symbol=${encodeURIComponent(
      symbol
    )}&days=${futureDays}`;

    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`${res.status} ${res.statusText} ${text}`);
    }
    const data = await res.json();

    // The backend sends { symbol, predictions: [...] }
    const mapped = data.predictions.map((row) => ({
      date: row.Date || row.date, // adjust depending on backend keys
      predicted_close: Number(row.predicted_close).toFixed(2),
      predicted_volume: row.predicted_volume
        ? Number(row.predicted_volume).toFixed(0)
        : null,
    }));

    setForecast(mapped);
    setTicker(symbol.toUpperCase());
  } catch (err) {
    console.error("Fetch error:", err);
    setError("Failed to fetch prediction: " + err.message);
  } finally {
    setLoading(false);
  }
}

  function handleLogout() {
    localStorage.removeItem("token");
    setIsLoggedIn(false);
    setIsAdmin(false);
    setToken("");
    setView("market-overview");
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
        <header className="bg-white shadow sticky top-0 z-40">
          <div className="max-w-screen-xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center cursor-pointer" onClick={() => setView("market-overview")}>
              <img src={Logo} alt="StockVisionData Logo" className="h-12 w-12 mr-3 hover:scale-110 transition-transform duration-300" />
              <h1 className="text-3xl font-bold tracking-tight text-blue-600 font-sans hidden sm:block hover:text-blue-700 transition-colors duration-300">StockVisionData</h1>
            </div>
            {isLoggedIn && (
              <nav className="flex space-x-2">
                <button 
                  className={`group relative overflow-hidden px-3 py-1.5 text-xs font-medium rounded-lg border transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 ${
                    view === "market-overview" 
                      ? "bg-gradient-to-r from-purple-50 to-purple-100 text-purple-700 border-purple-200 hover:border-purple-300 hover:shadow-purple-200/50" 
                      : "bg-gradient-to-r from-cyan-50 to-cyan-100 text-cyan-700 border-cyan-200 hover:border-cyan-300 hover:shadow-cyan-200/50"
                  }`}
                  onClick={() => setView("market-overview")}
                >
                  <span className="relative z-10 flex items-center space-x-1.5">
                    <svg className="w-3 h-3 group-hover:translate-x-0.5 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                    </svg>
                    <span>Market Overview</span>
                  </span>
                  <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg ${
                    view === "market-overview" ? "bg-gradient-to-r from-purple-200 to-purple-300" : "bg-gradient-to-r from-cyan-200 to-cyan-300"
                  }`}></div>
                </button>

                <button 
                  className={`group relative overflow-hidden px-3 py-1.5 text-xs font-medium rounded-lg border transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 ${
                    view === "main" 
                      ? "bg-gradient-to-r from-purple-50 to-purple-100 text-purple-700 border-purple-200 hover:border-purple-300 hover:shadow-purple-200/50" 
                      : "bg-gradient-to-r from-cyan-50 to-cyan-100 text-cyan-700 border-cyan-200 hover:border-cyan-300 hover:shadow-cyan-200/50"
                  }`}
                  onClick={() => setView("main")}
                >
                  <span className="relative z-10 flex items-center space-x-1.5">
                    <svg className="w-3 h-3 group-hover:translate-x-0.5 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span>Price Prediction</span>
                  </span>
                  <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg ${
                    view === "main" ? "bg-gradient-to-r from-purple-200 to-purple-300" : "bg-gradient-to-r from-cyan-200 to-cyan-300"
                  }`}></div>
                </button>

                <button 
                  className={`group relative overflow-hidden px-3 py-1.5 text-xs font-medium rounded-lg border transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 ${
                    view === "sentiment" 
                      ? "bg-gradient-to-r from-purple-50 to-purple-100 text-purple-700 border-purple-200 hover:border-purple-300 hover:shadow-purple-200/50" 
                      : "bg-gradient-to-r from-cyan-50 to-cyan-100 text-cyan-700 border-cyan-200 hover:border-cyan-300 hover:shadow-cyan-200/50"
                  }`}
                  onClick={() => setView("sentiment")}
                >
                  <span className="relative z-10 flex items-center space-x-1.5">
                    <svg className="w-3 h-3 group-hover:translate-x-0.5 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                    </svg>
                    <span>Market Sentiment</span>
                  </span>
                  <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg ${
                    view === "sentiment" ? "bg-gradient-to-r from-purple-200 to-purple-300" : "bg-gradient-to-r from-cyan-200 to-cyan-300"
                  }`}></div>
                </button>

                <button 
                  className={`group relative overflow-hidden px-3 py-1.5 text-xs font-medium rounded-lg border transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 ${
                    view === "technical" 
                      ? "bg-gradient-to-r from-purple-50 to-purple-100 text-purple-700 border-purple-200 hover:border-purple-300 hover:shadow-purple-200/50" 
                      : "bg-gradient-to-r from-cyan-50 to-cyan-100 text-cyan-700 border-cyan-200 hover:border-cyan-300 hover:shadow-cyan-200/50"
                  }`}
                  onClick={() => setView("technical")}
                >
                  <span className="relative z-10 flex items-center space-x-1.5">
                    <svg className="w-3 h-3 group-hover:translate-x-0.5 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>Technical Analysis</span>
                  </span>
                  <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg ${
                    view === "technical" ? "bg-gradient-to-r from-purple-200 to-purple-300" : "bg-gradient-to-r from-cyan-200 to-cyan-300"
                  }`}></div>
                </button>

                <button 
                  className={`group relative overflow-hidden px-3 py-1.5 text-xs font-medium rounded-lg border transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 ${
                    view === "portfolio" 
                      ? "bg-gradient-to-r from-purple-50 to-purple-100 text-purple-700 border-purple-200 hover:border-purple-300 hover:shadow-purple-200/50" 
                      : "bg-gradient-to-r from-cyan-50 to-cyan-100 text-cyan-700 border-cyan-200 hover:border-cyan-300 hover:shadow-cyan-200/50"
                  }`}
                  onClick={() => setView("portfolio")}
                >
                  <span className="relative z-10 flex items-center space-x-1.5">
                    <svg className="w-3 h-3 group-hover:translate-x-0.5 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <span>Portfolio</span>
                  </span>
                  <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg ${
                    view === "portfolio" ? "bg-gradient-to-r from-purple-200 to-purple-300" : "bg-gradient-to-r from-cyan-200 to-cyan-300"
                  }`}></div>
                </button>

                <button 
                  className={`group relative overflow-hidden px-3 py-1.5 text-xs font-medium rounded-lg border transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 ${
                    view === "profile" 
                      ? "bg-gradient-to-r from-purple-50 to-purple-100 text-purple-700 border-purple-200 hover:border-purple-300 hover:shadow-purple-200/50" 
                      : "bg-gradient-to-r from-cyan-50 to-cyan-100 text-cyan-700 border-cyan-200 hover:border-cyan-300 hover:shadow-cyan-200/50"
                  }`}
                  onClick={() => setView("profile")}
                >
                  <span className="relative z-10 flex items-center space-x-1.5">
                    <svg className="w-3 h-3 group-hover:translate-x-0.5 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span>Profile</span>
                  </span>
                  <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg ${
                    view === "profile" ? "bg-gradient-to-r from-purple-200 to-purple-300" : "bg-gradient-to-r from-cyan-200 to-cyan-300"
                  }`}></div>
                </button>

                <button 
                  className="group relative overflow-hidden px-3 py-1.5 bg-gradient-to-r from-red-50 to-red-100 text-red-700 font-medium text-xs rounded-lg border border-red-200 hover:border-red-300 transition-all duration-300 hover:shadow-md hover:shadow-red-200/50 hover:-translate-y-0.5"
                  onClick={handleLogout}
                >
                  <span className="relative z-10 flex items-center space-x-1.5">
                    <svg className="w-3 h-3 group-hover:translate-x-0.5 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Logout</span>
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-red-200 to-red-300 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg"></div>
                </button>
              </nav>
            )}
          </div>
        </header>

        <main className="max-w-screen-xl mx-auto px-6 py-10">
          {!isLoggedIn ? (
            <Login onLogin={() => window.location.reload()} />
          ) : isAdmin && view === "admin" ? (
            <AdminPanel token={token} />
          ) : view === "market-overview" ? (
            <MarketOverview />
          ) : view === "sentiment" ? (
            <MarketSentiment />
          ) : view === "technical" ? (
            <TechnicalAnalysis />
          ) : view === "portfolio" ? (
            <PortfolioFixed />
          ) : view === "profile" ? (
            <UserProfile />
          ) : (
            <>
              {/* Results Section First */}
              <div className="mt-10 flex flex-col items-center w-full">
                {loading && (
                  <div className="text-center text-gray-600 text-lg">Loading prediction…</div>
                )}

                {!loading && Array.isArray(forecast) && forecast.length > 0 && (
                  <section className="grid grid-cols-12 gap-6 w-full mb-10">
                    <motion.div
                      initial={{ opacity: 0, y: 60, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.7, delay: 0.1, type: 'spring', bounce: 0.25 }}
                      className="rounded-3xl bg-white shadow-xl p-8 hover:shadow-2xl transition-all duration-500 ease-in-out col-span-12 md:col-span-6 max-w-full overflow-x-auto shrink-0 h-[28rem]"
                    >
                      <h2 className="text-lg text-gray-600 font-semibold mb-4 font-sans">
                        Forecast Chart — {ticker}
                      </h2>
                      <div className="w-full">
                        <StockChart data={forecastToChartData(forecast.filter(row => row && typeof row === 'object'))} />
                      </div>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 60, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.7, delay: 0.2, type: 'spring', bounce: 0.25 }}
                      className="rounded-3xl bg-white shadow-xl p-8 hover:shadow-2xl transition-all duration-500 ease-in-out col-span-12 md:col-span-6 max-w-full overflow-x-auto flex-shrink-0 h-[28rem]"
                    >
                      <h2 className="text-lg text-gray-600 font-semibold mb-4 font-sans">
                        Forecast Table
                      </h2>
                      <div className="max-h-[28rem] overflow-y-auto">
                        <ForecastTable data={forecast.filter(row => row && typeof row === 'object')} />
                      </div>
                    </motion.div>
                  </section>
                )}
              </div>

              {/* Hero Section: Ticker and Predict Window in a Row if Results Exist */}
              <div className={`mb-10 flex flex-col items-center ${forecast.length > 0 ? 'md:flex-row md:justify-center md:space-x-8' : ''}`}>
                <motion.div
                  initial={{ opacity: 0, y: 60, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.7, type: 'spring', bounce: 0.25 }}
                  className="rounded-3xl bg-white shadow-xl p-10 hover:shadow-2xl transition-all duration-500 ease-in-out w-full max-w-3xl text-center"
                >
                  <h2 className="text-3xl font-bold tracking-tight mb-2 font-sans">AI Stock Price Predictor</h2>
                  <p className="text-base text-gray-700 mb-4 font-sans">Get instant, AI-powered forecasts for NSE stocks. Enter a ticker, select your forecast horizon, and visualize the future with confidence.</p>
                  <div className={`flex flex-col gap-4 items-center ${forecast.length > 0 ? 'md:flex-row md:gap-8 md:justify-center' : ''}`}>
                    <SearchBar
                      initialValue={ticker}
                      onSearch={(sym, days) => fetchPrediction(sym, days)}
                      loading={loading}
                    />
                    {error && (
                      <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-center w-full max-w-xs mx-auto">
                        {error}
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>

              {/* Message if no results */}
              {!loading && forecast.length === 0 && (
                <div className="mt-10 text-center text-base text-gray-700 font-sans">
                  Enter a ticker and click Predict to load forecast.
                </div>
              )}
            </>
          )}
        </main>

        <div className="max-w-2xl mx-auto mt-8 mb-4 p-4 bg-gray-50 border border-gray-200 rounded text-xs text-gray-700 font-sans italic leading-relaxed">
          <span className="font-semibold text-gray-500">Disclaimer:</span> Stock prices are affected by many unpredictable factors. Forecasts provided are advanced AI-generated and cannot be guaranteed. Use this information as guidance only, and invest at your own risk.
        </div>
        <footer className="text-center py-6 text-xs text-gray-400">
          © {new Date().getFullYear()} StockVisionData
        </footer>
      </div>
  );
}
