# Real-Time Chat Application with Socket.io

## 🚀 Project Overview
This project is a **fully functional real-time chat application** built with **React (CRA) frontend** and **Node.js + Express + Socket.io backend**.  
It demonstrates **bidirectional communication** between clients and server with features like live messaging, typing indicators, notifications, private messaging, file sharing, read receipts, message reactions, and user presence.  
The application is **responsive** and works on both desktop and mobile devices.

---

## ⚙️ Setup Instructions

### Prerequisites
- Node.js v18+ (v22 tested)
- npm or yarn

### Server Setup
```bash
cd server
npm install
npm run dev

Server runs on http://localhost:5000 (or configured port)

REST API endpoints:

GET /api/messages → Fetch messages (supports pagination & search)

GET /api/users → Get online users

POST /api/upload → Upload files/images

Client Setup

cd client
npm install
npm run dev

React app runs on http://localhost:3000

Connects to server using environment variable REACT_APP_SERVER_URL or default http://localhost:5000



🧰 Features Implemented
Core Features

Username-based login

Global chat room

Display messages with sender name and timestamp

Typing indicators

Online/offline user status

Real-time notifications when users join/leave

Advanced Features

Private messaging between users

Multiple chat rooms

File/image sharing

Read receipts for messages

Message reactions (like 👍, ❤️, etc.)

Search messages

Pagination for older messages

Browser notifications

Message delivery acknowledgment

Responsive design for desktop and mobile

📸 Screenshots / GIFs

Add screenshots or GIFs of your working application here:

Login Page
login.png

Global Chat Room
Chatpage.png




✅ Notes

Fully tested on desktop and mobile browsers

Uses Socket.io for real-time bidirectional communication

All advanced features per assignment requirements implemented

Supports up to 500 messages per room in memory

Error handling and loading states included
