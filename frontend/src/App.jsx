import React, { useState } from "react";
import Logo from "./assets/logo.svg";
import { motion } from "framer-motion";
import AdminPanel from "./components/AdminPanel";
import SearchBar from "./components/SearchBar";
import StockChart from "./components/StockChart";
import Login from "./components/Login";
import Portfolio from "./components/Portfolio";
import UserProfile from "./components/UserProfile";

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
  const [view, setView] = useState("main"); // main, portfolio, profile

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
    setView("main");
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="bg-white shadow sticky top-0 z-40">
        <div className="max-w-screen-xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <img src={Logo} alt="StockVisionData Logo" className="h-12 w-12 mr-3" />
            <h1 className="text-3xl font-bold tracking-tight text-blue-600 font-sans hidden sm:block">StockVisionData</h1>
          </div>
          {isLoggedIn && (
            <nav className="flex space-x-6">
              <button className="text-sm font-medium text-gray-600 hover:text-blue-600 transition" onClick={() => setView(view => view === "portfolio" ? "main" : "portfolio")}>{view === "portfolio" ? "Hide Portfolio" : "Show Portfolio"}</button>
              <button className="text-sm font-medium text-gray-600 hover:text-blue-600 transition" onClick={() => setView(view => view === "profile" ? "main" : "profile")}>{view === "profile" ? "Hide Profile" : "User Profile"}</button>
              <button className="text-sm font-medium text-red-600 hover:text-red-800 transition" onClick={handleLogout}>Logout</button>
            </nav>
          )}
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-6 py-10">
        {!isLoggedIn ? (
          <Login onLogin={() => window.location.reload()} />
        ) : isAdmin && view === "admin" ? (
          <AdminPanel token={token} />
        ) : view === "portfolio" ? (
          <Portfolio />
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
