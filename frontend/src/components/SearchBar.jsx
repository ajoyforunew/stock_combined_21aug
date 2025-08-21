import React, { useState } from "react";

export default function SearchBar({ initialValue = "", onSearch, loading }) {
  const [symbol, setSymbol] = useState(initialValue);
  const [days, setDays] = useState(30);

  function submit(e) {
    e.preventDefault();
    onSearch(symbol.trim().toUpperCase(), Number(days));
  }

  return (
    <form
      className="bg-white p-6 rounded-xl shadow-sm space-y-4 w-full max-w-xl mx-auto mb-6 flex flex-col items-center"
      onSubmit={submit}
    >
      {/* Ticker Input */}
      <label className="block w-1/2 mx-auto">
        <span className="text-sm font-medium text-gray-600">Ticker</span>
        <input
          type="text"
          placeholder="INFY"
          className="mt-1 block w-full h-10 rounded-lg border border-gray-300 shadow-xs focus:border-blue-500 focus:ring-3 focus:ring-blue-500 sm:text-sm text-center"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          required
        />
      </label>

      {/* Forecast Days Select */}
      <label className="block w-1/2 mx-auto">
        <span className="text-sm font-medium text-gray-600">Forecast days</span>
        <select
          className="mt-1 block w-full h-10 rounded-lg border border-gray-300 shadow-xs focus:border-blue-500 focus:ring-3 focus:ring-blue-500 sm:text-sm text-center"
          value={days}
          onChange={(e) => setDays(e.target.value)}
        >
          <option value="30">30 days</option>
          <option value="60">60 days</option>
          <option value="90">90 days</option>
        </select>
      </label>

      {/* Submit Button */}
      <button
        type="submit"
        className="w-1/2 h-10 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 shadow-md transition-all duration-300 focus:ring-3 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed mx-auto"
        disabled={loading}
      >
        {loading ? "Predicting..." : "Predict"}
      </button>
    </form>
  );
}
