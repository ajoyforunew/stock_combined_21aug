  const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@#$%^&*!()_+=\-\[\]{}|;:'",.<>/?`~]{8,20}$/;

import React, { useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");
  const [otpStep, setOtpStep] = useState(false);
  const [otp, setOtp] = useState("");

  function validatePassword(pw) {
    // 8-20 chars, at least one letter, one number, allow special chars
    const re = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@#$%^&*!()_+=\-\[\]{}|;:'\",.<>/?`~]{8,20}$/;
    return re.test(pw);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (isRegister && !otpStep) {
      // Try registration, but only validate password if user/email not already registered
      let skipValidation = false;
      try {
        const res = await fetch(API_BASE + "/register-request-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, email, password })
        });
        const data = await res.json();
        if (!res.ok) {
          // If error is username/email exists, skip validation and show backend error
          if ((data.detail || "").toLowerCase().includes("exists")) {
            setError(data.detail || data.msg || "User/email already exists");
            return;
          }
          throw new Error(data.detail || data.msg || "Error");
        }
        // Only validate password if registration is actually proceeding
        if (!validatePassword(password)) {
          setError("Password must be 8-20 characters, include at least one letter and one number, and may contain special characters.");
          return;
        }
        setOtpStep(true);
        setError("OTP sent to your email. Enter it below to complete registration.");
      } catch (err) {
        setError(err.message);
      }
      return;
    }
    if (isRegister && otpStep) {
      // Step 2: verify OTP
      try {
        const res = await fetch(API_BASE + "/register-verify-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, otp })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || data.msg || "Error");
        setIsRegister(false);
        setOtpStep(false);
        setOtp("");
        setError("Registration successful! Please log in.");
      } catch (err) {
        setError(err.message);
      }
      return;
    }
    // Normal login
    try {
      const res = await fetch(API_BASE + "/login-request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.msg || "Error");
      setOtpStep(true);
      setError("OTP sent to your email. Enter it below to log in.");
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleOtpLogin(e) {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch(API_BASE + "/login-verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, otp })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.msg || "Error");
      if (data && data.access_token) {
        localStorage.setItem("token", data.access_token);
      }
      setOtpStep(false);
      setOtp("");
      if (onLogin) onLogin();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-50 z-50">
      <div className="rounded-xl bg-white shadow-sm p-6 sm:p-8 hover:shadow-md transition-all duration-300 ease-in-out w-full max-w-md mx-auto flex flex-col items-center overflow-auto max-h-[90vh]">
        <div className="flex flex-col items-center mb-4">
          <h2 className="text-2xl font-bold mb-1">{isRegister ? "Create Account" : "Sign In"}</h2>
          <p className="text-gray-500 text-sm">to StockVisionData</p>
        </div>
        {!otpStep ? (
          <form onSubmit={handleSubmit} className="flex flex-col items-center w-full">
            <input
              id="username"
              name="username"
              className="mb-3 p-3 border border-gray-200 rounded-lg focus:outline-hidden focus:ring-3 focus:ring-blue-400 w-full max-w-xs"
              placeholder="Username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
            />
            {isRegister && (
              <input
                id="email"
                name="email"
                className="mb-3 p-3 border border-gray-200 rounded-lg focus:outline-hidden focus:ring-3 focus:ring-blue-400 w-full max-w-xs"
                placeholder="Email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            )}
            <input
              id="password"
              name="password"
              className="mb-5 p-3 border border-gray-200 rounded-lg focus:outline-hidden focus:ring-3 focus:ring-blue-400 w-full max-w-xs"
              placeholder="Password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              minLength={8}
              maxLength={20}
              pattern={passwordPattern.source}
              title="8-20 chars, at least one letter and one number, may include special characters"
              required
            />
            <button
              className="w-full max-w-xs mb-2 px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 shadow-md transition-all duration-300 focus:ring-3 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              type="submit"
            >
              {isRegister ? "Register" : "Login"}
            </button>
          </form>
        ) : (
          <form onSubmit={isRegister ? handleSubmit : handleOtpLogin} className="flex flex-col items-center w-full">
            <input
              id="otp"
              name="otp"
              className="mb-3 p-3 border border-gray-200 rounded-lg focus:outline-hidden focus:ring-3 focus:ring-blue-400 w-full max-w-xs"
              placeholder="Enter OTP"
              value={otp}
              onChange={e => setOtp(e.target.value)}
              required
            />
            <button
              className="w-full max-w-xs mb-2 px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 shadow-md transition-all duration-300 focus:ring-3 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              type="submit"
            >
              Verify OTP
            </button>
          </form>
        )}
        <button
          className="mt-2 text-blue-600 hover:text-blue-800 underline text-sm"
          onClick={() => { setIsRegister(!isRegister); setError(""); }}
        >
          {isRegister ? "Already have an account? Login" : "No account? Register"}
        </button>
        {error && <div className="mt-4 text-red-600 text-center text-sm">{error}</div>}
      </div>
    </div>
  );
}