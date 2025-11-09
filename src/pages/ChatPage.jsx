import React, { useEffect, useState, useRef } from "react";
import { socket } from "../socket/socket";

export default function ChatPage({ username }) {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [users, setUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [room, setRoom] = useState("global");
  const [rooms] = useState(["global", "sports", "coding", "random"]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState("");
  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);

  const notificationSound = new Audio("/notification.mp3");

  // Connect socket once
  useEffect(() => {
    if (!socket.connected) socket.connect();
    socket.emit("user_join", username);
    socket.emit("join_room", room);
  }, [username, room]);

  // Scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Browser notifications
  useEffect(() => {
    if ("Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission();
    }
  }, []);

  // Socket listeners
  useEffect(() => {
    // Messages
    const handleReceive = (msg) => {
      setMessages(prev => [...prev, msg]);
      if (msg.sender !== username) {
        notificationSound.play();
        if (Notification.permission === "granted" && document.hidden) {
          new Notification(msg.sender, { body: msg.message });
        }
        if (document.hidden) setUnreadCount(prev => prev + 1);
      }
    };

    socket.on("receive_message", handleReceive);
    socket.on("private_message", handleReceive);
    socket.on("user_list", setUsers);
    socket.on("typing_users", setTypingUsers);

    socket.on("user_joined", data => setMessages(prev => [...prev, { system: true, text: `${data.username} joined` }]));
    socket.on("user_left", data => setMessages(prev => [...prev, { system: true, text: `${data.username} left` }]));

    socket.on("message_reaction", ({ messageId, reactions }) => {
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, reactions } : m));
    });

    socket.on("message_read", ({ messageId, readBy }) => {
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, readBy } : m));
    });

    return () => {
      socket.off("receive_message", handleReceive);
      socket.off("private_message", handleReceive);
      socket.off("user_list");
      socket.off("typing_users");
      socket.off("user_joined");
      socket.off("user_left");
      socket.off("message_reaction");
      socket.off("message_read");
    };
  }, [username]);

  // Reset unread when tab visible
  useEffect(() => {
    const handleVisibility = () => {
      if (!document.hidden) setUnreadCount(0);
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  // Send message
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    const msgData = { message, room };
    if (selectedUser) {
      socket.emit("private_message", { to: selectedUser.id, message });
    } else {
      socket.emit("send_message", msgData);
    }

    setMessage("");
    socket.emit("typing", false);
  };

  const handleTyping = (e) => {
    setMessage(e.target.value);
    socket.emit("typing", e.target.value.length > 0);
  };

  const sendFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const data = await res.json();
    if (data.url) {
      const fileMessage = `[file](${data.url})`;
      if (selectedUser) {
        socket.emit("private_message", { to: selectedUser.id, message: fileMessage });
      } else {
        socket.emit("send_message", { message: fileMessage, room });
      }
    }
    fileInputRef.current.value = "";
  };

  const addReaction = (msgId, reaction) => {
    socket.emit("add_reaction", { messageId: msgId, reaction });
  };

  const markRead = (msgId) => {
    socket.emit("mark_read", msgId);
  };

  const loadOlderMessages = async () => {
    setLoadingMore(true);
    const res = await fetch(`/api/messages?room=${room}&page=${page}&pageSize=20&search=${search}`);
    const olderMessages = await res.json();
    setMessages(prev => [...olderMessages, ...prev]);
    setPage(prev => prev + 1);
    setLoadingMore(false);
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-full md:w-1/4 bg-gray-200 p-4 border-r overflow-y-auto">
        <h2>💬 Rooms</h2>
        {rooms.map(r => (
          <div key={r} onClick={() => { setRoom(r); setSelectedUser(null); setMessages([]); setPage(1); }} className={`cursor-pointer p-1 rounded ${room===r?"bg-blue-300":"hover:bg-blue-100"}`}>#{r}</div>
        ))}
        <h2 className="mt-4">🟢 Users</h2>
        {users.filter(u => u.username !== username).map(u => (
          <div key={u.id} onClick={() => { setSelectedUser(u); setMessages([]); setPage(1); }} className={`cursor-pointer p-1 rounded ${selectedUser?.id===u.id?"bg-green-300":"hover:bg-green-100"}`}>{u.username}</div>
        ))}
        <input type="text" placeholder="Search messages" value={search} onChange={(e)=>setSearch(e.target.value)} className="mt-4 p-1 w-full rounded border"/>
        <button className="mt-2 p-1 w-full bg-gray-400 text-white rounded" onClick={loadOlderMessages}>{loadingMore ? "Loading..." : "Load older messages"}</button>
      </aside>

      {/* Main chat */}
      <main className="flex-1 flex flex-col p-4">
        <header className="bg-blue-600 text-white p-4 text-center font-bold">
          Welcome {username} {unreadCount>0 && `(${unreadCount})`}
        </header>

        <div className="flex-1 overflow-y-auto border rounded p-2 bg-white mb-2">
          {messages.map((msg, idx) => (
            <div key={idx} className="mb-2">
              {msg.system ? <em className="text-gray-500">{msg.text}</em> :
                <>
                  <strong>{msg.sender}{msg.isPrivate ? " (private)" : ""}:</strong>{" "}
                  {msg.message.includes("[file]") ? (
                    <a href={msg.message.match(/\((.*)\)/)[1]} target="_blank" rel="noreferrer">📎 File</a>
                  ) : msg.message}
                  <div className="text-xs text-gray-500 flex gap-1 mt-1">
                    {["👍","❤️","😂","😮","😢","😡"].map(r => (
                      <button key={r} onClick={()=>addReaction(msg.id,r)}>{r} {msg.reactions?.[r]?.length || 0}</button>
                    ))}
                    {msg.readBy?.length>0 && <span>Read by: {msg.readBy.join(", ")}</span>}
                    <button onClick={()=>markRead(msg.id)}>Mark Read</button>
                  </div>
                </>
              }
            </div>
          ))}
          <div ref={chatEndRef}></div>
        </div>

        <div className="h-6 text-sm text-gray-600 mb-2">
          {typingUsers.length>0 && `${typingUsers.join(", ")} ${typingUsers.length>1?"are":"is"} typing...`}
        </div>

        <form onSubmit={sendMessage} className="flex gap-2">
          <input className="flex-1 border p-2 rounded" type="text" placeholder="Type a message..." value={message} onChange={handleTyping}/>
          <input type="file" ref={fileInputRef} onChange={sendFile}/>
          <button className="bg-blue-500 text-white px-4 py-2 rounded" type="submit">Send</button>
        </form>
      </main>
    </div>
  );
}
