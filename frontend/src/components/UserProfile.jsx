  const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@#$%^&*!()_+=\-\[\]{}|;:'",.<>/?`~]{8,20}$/;

import React, { useState, useEffect } from "react";
const API_BASE = import.meta.env.VITE_API_URL;

export default function UserProfile() {
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);

  useEffect(() => {
    async function fetchUser() {
      setError("");
      const token = localStorage.getItem("token");
      if (!token) return;
      try {
        const res = await fetch(`${API_BASE}/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Error fetching user");
        setUser(data.user);
      } catch (err) {
        setError(err.message);
      }
    }
    fetchUser();
  }, []);

  function validatePassword(pw) {
    // 8-20 chars, at least one letter, one number, allow special chars
    const re = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@#$%^&*!()_+=\-\[\]{}|;:'",.<>/?`~]{8,20}$/;
    return re.test(pw);
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!validatePassword(newPassword)) {
      setError("Password must be 8-20 characters, include at least one letter and one number, and may contain special characters.");
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) return setError("Not logged in");
    try {
      const res = await fetch(`${API_BASE}/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ current_password: oldPassword, new_password: newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.msg || "Error");
      setSuccess("Password changed!");
      setOldPassword(""); setNewPassword("");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
  <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-sm shadow-sm">
      <h2 className="text-xl font-bold mb-4">User Profile</h2>
      {user && <div className="mb-4">Logged in as: <b>{user}</b></div>}
      <form onSubmit={handleChangePassword} className="mb-4">
        <h3 className="font-semibold mb-2">Change Password</h3>
        <input
          className="w-full mb-2 p-2 border rounded"
          placeholder="Old Password"
          type="password"
          value={oldPassword}
          onChange={e => setOldPassword(e.target.value)}
          required
        />
        <div className="relative mb-2">
          <input
            className="w-full p-2 border rounded pr-10"
            placeholder="New Password"
            type={showNewPassword ? "text" : "password"}
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            minLength={8}
            maxLength={20}
            pattern={passwordPattern.source}
            title="8-20 chars, at least one letter and one number, may include special characters"
            required
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500"
            onClick={() => setShowNewPassword(v => !v)}
            tabIndex={-1}
            aria-label={showNewPassword ? "Hide password" : "Show password"}
          >
            {showNewPassword ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4.477-10-10 0-1.657.403-3.22 1.125-4.575M15 12a3 3 0 11-6 0 3 3 0 016 0zm6.364-2.364A9.956 9.956 0 0022 9c0 5.523-4.477 10-10 10a9.956 9.956 0 01-4.636-1.364" /></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zm2.828-2.828A9.956 9.956 0 0122 12c0 5.523-4.477 10-10 10S2 17.523 2 12c0-2.21.896-4.21 2.343-5.657" /></svg>
            )}
          </button>
        </div>
        <button className="w-full bg-blue-600 text-white py-2 rounded" type="submit">
          Change Password
        </button>
      </form>
      {error && <div className="mb-2 text-red-600">{error}</div>}
      {success && <div className="mb-2 text-green-600">{success}</div>}
    </div>
  );
}
