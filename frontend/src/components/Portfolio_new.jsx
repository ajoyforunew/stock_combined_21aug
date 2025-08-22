import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

function Portfolio() {
  const [portfolioData, setPortfolioData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Form state for adding stocks
  const [symbol, setSymbol] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [avgPrice, setAvgPrice] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [sector, setSector] = useState('');
  const [notes, setNotes] = useState('');

  // Available Indian stocks for reference
  const availableStocks = [
    { symbol: 'RELIANCE.NS', name: 'Reliance Industries' },
    { symbol: 'TCS.NS', name: 'Tata Consultancy Services' },
    { symbol: 'HDFCBANK.NS', name: 'HDFC Bank' },
    { symbol: 'INFY.NS', name: 'Infosys' },
    { symbol: 'ICICIBANK.NS', name: 'ICICI Bank' },
    { symbol: 'HINDUNILVR.NS', name: 'Hindustan Unilever' },
    { symbol: 'SBIN.NS', name: 'State Bank of India' },
    { symbol: 'BHARTIARTL.NS', name: 'Bharti Airtel' },
    { symbol: 'ITC.NS', name: 'ITC Limited' },
    { symbol: 'KOTAKBANK.NS', name: 'Kotak Mahindra Bank' },
    { symbol: 'LT.NS', name: 'Larsen & Toubro' },
    { symbol: 'ASIANPAINT.NS', name: 'Asian Paints' },
    { symbol: 'AXISBANK.NS', name: 'Axis Bank' },
    { symbol: 'MARUTI.NS', name: 'Maruti Suzuki' },
    { symbol: 'BAJFINANCE.NS', name: 'Bajaj Finance' },
    { symbol: 'HCLTECH.NS', name: 'HCL Technologies' },
    { symbol: 'WIPRO.NS', name: 'Wipro' },
    { symbol: 'ULTRACEMCO.NS', name: 'UltraTech Cement' },
    { symbol: 'TITAN.NS', name: 'Titan Company' },
    { symbol: 'SUNPHARMA.NS', name: 'Sun Pharmaceutical' }
  ];

  const fetchPortfolio = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/portfolio/holdings?user_id=1`);
      if (response.ok) {
        const data = await response.json();
        setPortfolioData(data);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || "Failed to fetch portfolio data");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const removeFromPortfolio = async (portfolioId, symbol) => {
    if (!confirm(`Are you sure you want to remove ${symbol} from your portfolio?`)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/portfolio/${portfolioId}`, {
        method: "DELETE"
      });

      if (response.ok) {
        setSuccess(`${symbol} removed from portfolio`);
        fetchPortfolio();
      } else {
        const errorData = await response.json();
        setError(errorData.detail || "Failed to remove stock from portfolio");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    }
  };

  const refreshPortfolio = () => {
    setRefreshing(true);
    fetchPortfolio();
  };

  useEffect(() => {
    fetchPortfolio();
    // Auto-refresh every 2 minutes
    const interval = setInterval(fetchPortfolio, 120000);
    return () => clearInterval(interval);
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getChangeColor = (value) => {
    if (value > 0) return 'text-green-600';
    if (value < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getChangeBg = (value) => {
    if (value > 0) return 'bg-green-50';
    if (value < 0) return 'bg-red-50';
    return 'bg-gray-50';
  };

  // Handle adding new stock to portfolio
  const handleAdd = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    
    if (!symbol || !quantity || !avgPrice) {
      setError("Please fill in all required fields");
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE}/api/portfolio/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: 1, // Hard-coded for now
          symbol: symbol,
          quantity: parseInt(quantity),
          avg_purchase_price: parseFloat(avgPrice),
          company_name: companyName || symbol.replace('.NS', ''),
          sector: sector || "Unknown",
          notes: notes || ""
        })
      });

      if (response.ok) {
        setSuccess("Stock added to portfolio successfully!");
        setSymbol("");
        setQuantity(1);
        setAvgPrice("");
        setCompanyName("");
        setSector("");
        setNotes("");
        fetchPortfolio();
      } else {
        const errorData = await response.json();
        setError(errorData.detail || "Failed to add stock to portfolio");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-4 text-gray-600">Loading portfolio...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Portfolio Management</h1>
          <button
            onClick={refreshPortfolio}
            disabled={refreshing}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              refreshing 
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* Portfolio Summary */}
        {portfolioData?.summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Total Value</h3>
              <p className="text-3xl font-bold text-blue-600">
                {formatCurrency(portfolioData.summary.total_current_value)}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Total Invested</h3>
              <p className="text-3xl font-bold text-gray-800">
                {formatCurrency(portfolioData.summary.total_invested)}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Total P&L</h3>
              <p className={`text-3xl font-bold ${getChangeColor(portfolioData.summary.total_pnl)}`}>
                {portfolioData.summary.total_pnl >= 0 ? '+' : ''}
                {formatCurrency(portfolioData.summary.total_pnl)}
              </p>
              <p className={`text-sm ${getChangeColor(portfolioData.summary.total_pnl_percent)}`}>
                ({portfolioData.summary.total_pnl_percent >= 0 ? '+' : ''}
                {portfolioData.summary.total_pnl_percent.toFixed(2)}%)
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Today's Change</h3>
              <p className={`text-2xl font-bold ${getChangeColor(portfolioData.summary.total_day_change)}`}>
                {portfolioData.summary.total_day_change >= 0 ? '+' : ''}
                {formatCurrency(portfolioData.summary.total_day_change)}
              </p>
              <p className={`text-sm ${getChangeColor(portfolioData.summary.total_day_change_percent)}`}>
                ({portfolioData.summary.total_day_change_percent >= 0 ? '+' : ''}
                {portfolioData.summary.total_day_change_percent.toFixed(2)}%)
              </p>
            </div>
          </div>
        )}

        {/* Holdings Table */}
        {portfolioData?.holdings && portfolioData.holdings.length > 0 ? (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Your Holdings</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left p-3 font-semibold text-gray-700">Stock</th>
                    <th className="text-right p-3 font-semibold text-gray-700">Qty</th>
                    <th className="text-right p-3 font-semibold text-gray-700">Avg Price</th>
                    <th className="text-right p-3 font-semibold text-gray-700">Current Price</th>
                    <th className="text-right p-3 font-semibold text-gray-700">P&L</th>
                    <th className="text-right p-3 font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {portfolioData.holdings.map((holding) => (
                    <tr key={holding.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="p-3">
                        <div>
                          <p className="font-semibold text-gray-800">{holding.symbol}</p>
                          <p className="text-sm text-gray-600">{holding.company_name}</p>
                        </div>
                      </td>
                      <td className="text-right p-3 text-gray-700">{holding.quantity}</td>
                      <td className="text-right p-3 text-gray-700">₹{holding.avg_purchase_price.toFixed(2)}</td>
                      <td className="text-right p-3 text-gray-700">₹{holding.current_price.toFixed(2)}</td>
                      <td className={`text-right p-3 font-semibold ${getChangeColor(holding.total_pnl)}`}>
                        {holding.total_pnl >= 0 ? '+' : ''}₹{holding.total_pnl.toFixed(2)}
                        <br />
                        <span className="text-xs">
                          ({holding.pnl_percent >= 0 ? '+' : ''}{holding.pnl_percent.toFixed(2)}%)
                        </span>
                      </td>
                      <td className="text-right p-3">
                        <button
                          onClick={() => removeFromPortfolio(holding.id, holding.symbol)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8 text-center">
            <p className="text-gray-600">No holdings found. Add some stocks to get started!</p>
          </div>
        )}

        {/* Add Stock Form */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Add New Stock</h2>
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-600">{error}</p>
            </div>
          )}
          
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <p className="text-green-600">{success}</p>
            </div>
          )}

          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stock Symbol *
                </label>
                <input
                  type="text"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. RELIANCE.NS"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name
                </label>
                <input
                  type="text"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Company Name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity *
                </label>
                <input
                  type="number"
                  min="1"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Number of shares"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Average Purchase Price *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="₹ 0.00"
                  value={avgPrice}
                  onChange={(e) => setAvgPrice(e.target.value)}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sector
                </label>
                <select
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                >
                  <option value="">Select Sector</option>
                  <option value="Banking">Banking</option>
                  <option value="IT">Information Technology</option>
                  <option value="Auto">Automobile</option>
                  <option value="Pharma">Pharmaceuticals</option>
                  <option value="Energy">Energy</option>
                  <option value="FMCG">FMCG</option>
                  <option value="Metals">Metals</option>
                  <option value="Telecom">Telecommunications</option>
                  <option value="Real Estate">Real Estate</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows="3"
                  placeholder="Investment notes or strategy..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                ></textarea>
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-medium"
              >
                Add to Portfolio
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

export default Portfolio;
