import { Server } from 'socket.io';

class SocketService {
  constructor() {
    this.io = null;
    this.onlineUsers = new Map();
  }

  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: "*",
      },
    });

    this.setupEventHandlers();
    return this.io;
  }

  setupEventHandlers() {
    this.io.on("connection", (socket) => {
      console.log("User connected:", socket.id);

      socket.on("registerUser", (userId) => {
        this.registerUser(userId, socket.id);
      });

      socket.on("disconnect", () => {
        this.handleDisconnect(socket.id);
      });
    });
  }

  registerUser(userId, socketId) {
    this.onlineUsers.set(userId, socketId);
    console.log(`User ${userId} registered with Socket ID: ${socketId}`);
  }

  handleDisconnect(socketId) {
    console.log("User disconnected:", socketId);

    for (let [userId, userSocketId] of this.onlineUsers.entries()) {
      if (userSocketId === socketId) {
        this.onlineUsers.delete(userId);
        console.log(`User ${userId} removed from online users`);
        break;
      }
    }
  }

  getOnlineUsers() {
    return this.onlineUsers;
  }

  getIO() {
    return this.io;
  }

  emitToUser(userId, event, data) {
    const socketId = this.onlineUsers.get(userId);
    if (socketId && this.io) {
      this.io.to(socketId).emit(event, data);
    }
  }

  emitToAll(event, data) {
    if (this.io) {
      this.io.emit(event, data);
    }
  }
}

const socketService = new SocketService();
export default socketService;