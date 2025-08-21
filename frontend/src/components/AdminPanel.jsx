import React, { useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function AdminPanel({ token }) {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    fetch(API_BASE + "/admin/users", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setUsers(data))
      .catch(err => setError("Failed to fetch users: " + err.message));
  }, [token]);

  if (!token) return <div className="mt-8 text-red-600">Admin login required.</div>;

  return (
  <div className="max-w-lg mx-auto mt-10 p-6 bg-white rounded-sm shadow-sm">
      <h2 className="text-xl font-bold mb-4">Admin Panel: User List</h2>
      {error && <div className="mb-4 text-red-600">{error}</div>}
      <table className="w-full border">
        <thead>
          <tr>
            <th className="border px-2 py-1">ID</th>
            <th className="border px-2 py-1">Username</th>
            <th className="border px-2 py-1">Admin?</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id}>
              <td className="border px-2 py-1">{u.id}</td>
              <td className="border px-2 py-1">{u.username}</td>
              <td className="border px-2 py-1">{u.is_admin ? "Yes" : "No"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
