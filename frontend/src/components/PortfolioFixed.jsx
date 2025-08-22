import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

const PortfolioFixed = () => {
  const [portfolioData, setPortfolioData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  // Add stock form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [symbol, setSymbol] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [avgPrice, setAvgPrice] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [sector, setSector] = useState('IT');
  const [notes, setNotes] = useState('');

  const fetchPortfolio = async () => {
    try {
      console.log('Fetching portfolio...');
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/portfolio/holdings?user_id=1`);
      if (response.ok) {
        const data = await response.json();
        console.log('Portfolio data received:', data);
        setPortfolioData(data);
        setLastUpdated(new Date());
        setError(null);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || "Failed to fetch portfolio data");
      }
    } catch (err) {
      console.error('Network error:', err);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const addToPortfolio = async (e) => {
    e.preventDefault();
    
    if (!symbol || !avgPrice || quantity <= 0) {
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
          user_id: 1,
          symbol: symbol.toUpperCase(),
          quantity: parseInt(quantity),
          avg_purchase_price: parseFloat(avgPrice),
          company_name: companyName || symbol.toUpperCase(),
          sector: sector || "Unknown",
          notes: notes || ""
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setSuccess(`Successfully added ${symbol.toUpperCase()} to portfolio`);
        setError(null);
        
        // Reset form
        setSymbol('');
        setQuantity(1);
        setAvgPrice('');
        setCompanyName('');
        setSector('IT');
        setNotes('');
        setShowAddForm(false);
        
        // Refresh portfolio
        fetchPortfolio();
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || "Failed to add stock");
      }
    } catch (err) {
      setError("Network error. Please try again.");
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
        setSuccess(`Successfully removed ${symbol} from portfolio`);
        setError(null);
        fetchPortfolio();
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || "Failed to remove stock");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    }
  };

  useEffect(() => {
    fetchPortfolio();
  }, []); // Remove auto-refresh for now

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-4 text-gray-600">Loading portfolio...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 m-4">
        <h3 className="text-red-800 font-medium">Error</h3>
        <p className="text-red-600">{error}</p>
        <button 
          onClick={() => {
            setError(null);
            setLoading(true);
            fetchPortfolio();
          }}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-4">
      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800">{success}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Portfolio Management</h1>
            {lastUpdated && (
              <p className="text-sm text-gray-500 mt-1">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </p>
            )}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className={`group relative inline-flex items-center justify-center px-5 py-2.5 overflow-hidden font-medium transition duration-300 ease-out border-2 rounded-xl shadow-md ${
                showAddForm 
                  ? 'border-red-500 text-red-500 hover:text-white'
                  : 'border-green-500 text-green-500 hover:text-white'
              }`}
            >
              <span className={`absolute inset-0 flex items-center justify-center w-full h-full text-white duration-300 -translate-x-full ${
                showAddForm 
                  ? 'bg-red-500 group-hover:translate-x-0 ease'
                  : 'bg-green-500 group-hover:translate-x-0 ease'
              }`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  {showAddForm ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                  )}
                </svg>
              </span>
              <span className={`absolute flex items-center justify-center w-full h-full transition-all duration-300 transform group-hover:translate-x-full ease ${
                showAddForm ? 'text-red-500' : 'text-green-500'
              }`}>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {showAddForm ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                  )}
                </svg>
                {showAddForm ? 'Cancel' : 'Add Stock'}
              </span>
              <span className="relative invisible">
                {showAddForm ? 'Cancel' : 'Add Stock'}
              </span>
            </button>
            
            <button
              onClick={fetchPortfolio}
              disabled={loading}
              className={`group relative inline-flex items-center justify-center px-5 py-2.5 overflow-hidden font-medium transition duration-300 ease-out border-2 rounded-xl shadow-md ${
                loading 
                  ? 'border-gray-300 text-gray-400 cursor-not-allowed bg-gray-50' 
                  : 'border-blue-500 text-blue-500 hover:text-white'
              }`}
            >
              {!loading && (
                <span className="absolute inset-0 flex items-center justify-center w-full h-full text-white duration-300 -translate-x-full bg-blue-500 group-hover:translate-x-0 ease">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                  </svg>
                </span>
              )}
              <span className={`absolute flex items-center justify-center w-full h-full transition-all duration-300 transform ${
                loading 
                  ? 'text-gray-400' 
                  : 'text-blue-500 group-hover:translate-x-full ease'
              }`}>
                {loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Updating...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                    </svg>
                    Refresh Prices
                  </>
                )}
              </span>
              <span className="relative invisible">
                {loading ? 'Updating...' : 'Refresh Prices'}
              </span>
            </button>
          </div>
        </div>

        {/* Add Stock Form */}
        {showAddForm && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Add New Stock</h3>
            <form onSubmit={addToPortfolio} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Symbol *
                </label>
                <input
                  type="text"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  placeholder="TCS, RELIANCE, etc."
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity *
                </label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  min="1"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Purchase Price *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={avgPrice}
                  onChange={(e) => setAvgPrice(e.target.value)}
                  placeholder="1000.50"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Tata Consultancy Services"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sector
                </label>
                <select
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="IT">Information Technology</option>
                  <option value="Banking">Banking</option>
                  <option value="Pharmaceuticals">Pharmaceuticals</option>
                  <option value="Automotive">Automotive</option>
                  <option value="Energy">Energy</option>
                  <option value="FMCG">FMCG</option>
                  <option value="Metals">Metals</option>
                  <option value="Telecom">Telecom</option>
                  <option value="Unknown">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Long term, Short term, etc."
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="md:col-span-3">
                <button
                  type="submit"
                  className="group relative inline-flex items-center justify-center px-8 py-3 overflow-hidden font-medium transition duration-300 ease-out border-2 border-blue-500 rounded-xl shadow-md text-blue-500 hover:text-white"
                >
                  <span className="absolute inset-0 flex items-center justify-center w-full h-full text-white duration-300 -translate-x-full bg-blue-500 group-hover:translate-x-0 ease">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                    </svg>
                  </span>
                  <span className="absolute flex items-center justify-center w-full h-full text-blue-500 transition-all duration-300 transform group-hover:translate-x-full ease">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                    </svg>
                    Add to Portfolio
                  </span>
                  <span className="relative invisible">Add to Portfolio</span>
                </button>
              </div>
            </form>
          </div>
        )}

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
              <p className="text-3xl font-bold text-gray-700">
                {formatCurrency(portfolioData.summary.total_invested)}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Total P&L</h3>
              <p className={`text-3xl font-bold ${portfolioData.summary.total_pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(portfolioData.summary.total_pnl)}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Holdings</h3>
              <p className="text-3xl font-bold text-purple-600">
                {portfolioData.summary.holdings_count}
              </p>
            </div>
          </div>
        )}

        {/* Holdings Table */}
        {portfolioData?.holdings && portfolioData.holdings.length > 0 ? (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 p-6 pb-0">Your Holdings</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invested Value</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Market Value</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">P&L</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {portfolioData.holdings.map((holding) => (
                    <tr key={holding.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{holding.ticker_symbol}</div>
                          <div className="text-sm text-gray-500">{holding.company_name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {holding.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(holding.avg_purchase_price)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(holding.current_price)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {holding.current_price !== holding.avg_purchase_price ? 'Live Price' : 'Stored Price'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(holding.invested_value)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(holding.current_value)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {holding.quantity} × {formatCurrency(holding.current_price)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-medium ${holding.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(holding.pnl)} ({holding.pnl_percentage.toFixed(2)}%)
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => removeFromPortfolio(holding.id, holding.ticker_symbol)}
                          className="group relative inline-flex items-center justify-center px-4 py-2 overflow-hidden font-medium transition duration-300 ease-out border-2 border-red-500 rounded-lg shadow-sm text-red-500 hover:text-white"
                        >
                          <span className="absolute inset-0 flex items-center justify-center w-full h-full text-white duration-300 -translate-x-full bg-red-500 group-hover:translate-x-0 ease">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                          </span>
                          <span className="absolute flex items-center justify-center w-full h-full text-red-500 transition-all duration-300 transform group-hover:translate-x-full ease">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                            Remove
                          </span>
                          <span className="relative invisible">Remove</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Holdings Found</h3>
            <p className="text-gray-600">Add some stocks to get started!</p>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default PortfolioFixed;
