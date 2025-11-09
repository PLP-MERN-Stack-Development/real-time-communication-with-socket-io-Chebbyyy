import { io } from "socket.io-client";

export const socket = io(process.env.REACT_APP_SERVER_URL || "http://localhost:5000", {
  autoConnect: false,
});
