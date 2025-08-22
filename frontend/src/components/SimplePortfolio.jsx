import React, { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

const SimplePortfolio = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Fetching portfolio data...');
        const response = await fetch(`${API_BASE}/api/portfolio/holdings?user_id=1`);
        console.log('Response status:', response.status);
        
        if (response.ok) {
          const result = await response.json();
          console.log('Portfolio data:', result);
          setData(result);
        } else {
          const errorData = await response.json();
          setError(errorData.detail || "Failed to fetch portfolio data");
        }
      } catch (err) {
        console.error('Error fetching portfolio:', err);
        setError("Network error: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div className="p-4">Loading portfolio...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600">Error: {error}</div>;
  }

  if (!data) {
    return <div className="p-4">No data received</div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Simple Portfolio Test</h1>
      
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Summary</h2>
        <p>Holdings: {data.summary?.holdings_count || 0}</p>
        <p>Total Value: ₹{data.summary?.total_current_value || 0}</p>
        <p>Total Invested: ₹{data.summary?.total_invested || 0}</p>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-2">Holdings</h2>
        {data.holdings && data.holdings.length > 0 ? (
          <div className="space-y-2">
            {data.holdings.map((holding) => (
              <div key={holding.id} className="border p-3 rounded">
                <div className="font-medium">{holding.ticker_symbol}</div>
                <div className="text-sm text-gray-600">
                  Quantity: {holding.quantity} | Price: ₹{holding.avg_purchase_price}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p>No holdings found</p>
        )}
      </div>
    </div>
  );
};

export default SimplePortfolio;
