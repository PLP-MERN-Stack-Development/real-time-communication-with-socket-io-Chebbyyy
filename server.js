const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const multer = require("multer");
const fs = require("fs");

// Load env
dotenv.config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

// Create upload folder if not exists
const uploadDir = path.join(__dirname, "public/uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

// Data stores
const users = {};
const messages = {}; // { roomName: [messages] }
const typingUsers = {};

// --- Socket.io connection ---
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // User joins with username
  socket.on("user_join", (username) => {
    users[socket.id] = { id: socket.id, username, room: "global" };
    socket.join("global");
    io.emit("user_list", Object.values(users));
    io.emit("user_joined", { username, id: socket.id });
    console.log(`${username} joined`);
  });

  // Join room
  socket.on("join_room", (room) => {
    const prevRoom = users[socket.id]?.room || "global";
    socket.leave(prevRoom);
    socket.join(room);
    users[socket.id].room = room;

    // Send existing messages of room
    socket.emit("load_messages", messages[room] || []);
  });

  // Global message
  socket.on("send_message", (data) => {
    const room = data.room || "global";
    const msg = {
      id: Date.now(),
      sender: users[socket.id]?.username || "Anonymous",
      senderId: socket.id,
      message: data.message,
      timestamp: new Date().toISOString(),
      reactions: {},
      readBy: [],
    };

    if (!messages[room]) messages[room] = [];
    messages[room].push(msg);
    if (messages[room].length > 500) messages[room].shift();

    io.to(room).emit("receive_message", msg);
  });

  // Private message
  socket.on("private_message", ({ to, message }) => {
    const msg = {
      id: Date.now(),
      sender: users[socket.id]?.username || "Anonymous",
      senderId: socket.id,
      message,
      timestamp: new Date().toISOString(),
      isPrivate: true,
      reactions: {},
      readBy: [],
    };
    socket.to(to).emit("private_message", msg);
    socket.emit("private_message", msg);
  });

  // Typing
  socket.on("typing", (isTyping) => {
    if (!users[socket.id]) return;
    const room = users[socket.id].room;
    if (isTyping) typingUsers[socket.id] = users[socket.id].username;
    else delete typingUsers[socket.id];
    io.to(room).emit("typing_users", Object.values(typingUsers));
  });

  // Message reaction
  socket.on("add_reaction", ({ messageId, reaction }) => {
    const room = users[socket.id]?.room || "global";
    const msg = (messages[room] || []).find(m => m.id === messageId);
    if (!msg) return;
    if (!msg.reactions[reaction]) msg.reactions[reaction] = [];
    if (!msg.reactions[reaction].includes(socket.id)) msg.reactions[reaction].push(socket.id);
    io.to(room).emit("message_reaction", { messageId, reactions: msg.reactions });
  });

  // Mark message read
  socket.on("mark_read", (messageId) => {
    const room = users[socket.id]?.room || "global";
    const msg = (messages[room] || []).find(m => m.id === messageId);
    if (!msg) return;
    if (!msg.readBy.includes(users[socket.id].username)) msg.readBy.push(users[socket.id].username);
    io.to(room).emit("message_read", { messageId, readBy: msg.readBy });
  });

  // Disconnect
  socket.on("disconnect", () => {
    if (users[socket.id]) {
      const { username, room } = users[socket.id];
      io.to(room).emit("user_left", { username, id: socket.id });
      delete typingUsers[socket.id];
      delete users[socket.id];
      io.emit("user_list", Object.values(users));
    }
    console.log(`User disconnected: ${socket.id}`);
  });
});

// --- Upload endpoint ---
app.post("/api/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ url: fileUrl });
});

// --- Get messages ---
app.get("/api/messages", (req, res) => {
  const room = req.query.room || "global";
  let page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 20;
  const search = req.query.search?.toLowerCase() || "";

  const roomMessages = messages[room] || [];
  let filtered = search ? roomMessages.filter(m => m.message.toLowerCase().includes(search)) : roomMessages;

  const start = Math.max(filtered.length - page * pageSize, 0);
  const paginated = filtered.slice(start, start + pageSize);
  res.json(paginated);
});

// --- Get users ---
app.get("/api/users", (req, res) => {
  res.json(Object.values(users));
});

// --- Root ---
app.get("/", (req, res) => res.send("Socket.io Chat Server Running"));

// --- Start server ---
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
