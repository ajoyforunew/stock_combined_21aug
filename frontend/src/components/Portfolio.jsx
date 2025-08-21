import React, { useState, useEffect } from "react";
const API_BASE = import.meta.env.VITE_API_URL;

export default function Portfolio() {
  const [portfolio, setPortfolio] = useState([]);
  const [symbol, setSymbol] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selected, setSelected] = useState([]);

  async function fetchPortfolio() {
    setError("");
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/portfolio`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error fetching portfolio");
      setPortfolio(data.portfolio);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    fetchPortfolio();
  }, []);

  async function handleAdd(e) {
    e.preventDefault();
    setError(""); setSuccess("");
    const token = localStorage.getItem("token");
    if (!token) return setError("Not logged in");
    try {
      const res = await fetch(`${API_BASE}/portfolio/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ symbol, quantity })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.msg || "Error");
      setSuccess("Stock added!");
      setSymbol(""); setQuantity(1);
      fetchPortfolio();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="max-w-lg mx-auto mt-10 p-6 bg-white rounded-sm shadow-sm">
      <h2 className="text-xl font-bold mb-4">Your Portfolio</h2>
      <form onSubmit={handleAdd} className="flex gap-2 mb-4">
        <input
          className="flex-1 p-2 border rounded"
          placeholder="Symbol (e.g. RELIANCE.NS)"
          value={symbol}
          onChange={e => setSymbol(e.target.value)}
          required
        />
        <input
          className="w-20 p-2 border rounded"
          type="number"
          min="1"
          value={quantity}
          onChange={e => setQuantity(Number(e.target.value))}
          required
        />
        <button className="bg-blue-600 text-white px-4 py-2 rounded" type="submit">
          Add
        </button>
      </form>
      {error && <div className="mb-2 text-red-600">{error}</div>}
      {success && <div className="mb-2 text-green-600">{success}</div>}
      <form onSubmit={async e => {
        e.preventDefault();
        setError(""); setSuccess("");
        const token = localStorage.getItem("token");
        if (!token) return setError("Not logged in");
        try {
          for (const symbol of selected) {
            const res = await fetch(`${API_BASE}/portfolio/delete?symbol=${encodeURIComponent(symbol)}`,
              { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
            let data = {};
            try {
              data = await res.json();
            } catch (e) {
              // If response is empty, ignore JSON parse error
            }
            if (!res.ok) throw new Error(data.detail || data.msg || "Error");
          }
          setSuccess("Deleted selected tickers.");
          setSelected([]);
          fetchPortfolio();
        } catch (err) {
          setError(err.message);
        }
      }}>
        <table className="w-full mt-4 border">
          <thead>
            <tr>
              <th className="border px-2 py-1">Select</th>
              <th className="border px-2 py-1">Symbol</th>
              <th className="border px-2 py-1">Quantity</th>
            </tr>
          </thead>
          <tbody>
            {portfolio.map((row, i) => (
              <tr key={i}>
                <td className="border px-2 py-1 text-center">
                  <input
                    type="checkbox"
                    checked={selected.includes(row.symbol)}
                    onChange={e => {
                      if (e.target.checked) {
                        setSelected(sel => [...sel, row.symbol]);
                      } else {
                        setSelected(sel => sel.filter(s => s !== row.symbol));
                      }
                    }}
                  />
                </td>
                <td className="border px-2 py-1">{row.symbol}</td>
                <td className="border px-2 py-1">{row.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          className="mt-2 bg-red-600 text-white px-4 py-2 rounded"
          type="submit"
          disabled={selected.length === 0}
        >
          Delete Selected
        </button>
      </form>
    </div>
  );
}
