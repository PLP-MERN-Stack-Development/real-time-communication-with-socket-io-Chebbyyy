import React, { useState } from "react";
import ChatPage from "./ChatPage";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    if (!username.trim()) return;
    setLoggedIn(true);
  };

  return !loggedIn ? (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <form onSubmit={handleLogin} className="bg-white p-6 rounded shadow-md">
        <h1 className="text-2xl font-bold mb-4">Login to Chat</h1>
        <input
          type="text"
          placeholder="Enter your username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="border p-2 w-full rounded mb-4"
        />
        <button type="submit" className="w-full bg-blue-500 text-white p-2 rounded">
          Join
        </button>
      </form>
    </div>
  ) : (
    <ChatPage username={username} />
  );
}
