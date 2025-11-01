import { Server } from 'socket.io';
import jwt from "jsonwebtoken";
import { userModel } from "../../DB/models/User.model.js";
import logger from "../utils/logService.js";

class SocketService {
  constructor() {
    this.io = null;
    this.onlineUsers = new Map();
  }

  initialize(server) {
    // Get allowed origins from environment
    const allowedOrigins = process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
      : ['http://localhost:3000', 'http://localhost:3001'];

    this.io = new Server(server, {
      cors: {
        origin: allowedOrigins,
        credentials: true,
        methods: ['GET', 'POST']
      },
    });

    logger.info("Socket.IO initialized with authenticated connections");
    this.setupAuthentication();
    this.setupEventHandlers();
    return this.io;
  }

  /**
   * Setup Socket.IO authentication middleware
   */
  setupAuthentication() {
    this.io.use(async (socket, next) => {
      try {
        // Get token from auth header or query parameter
        const token = socket.handshake.auth.token || socket.handshake.query.token;

        if (!token) {
          logger.warn('Socket connection attempt without token', {
            socketId: socket.id,
            remoteAddress: socket.handshake.address
          });
          return next(new Error('Authentication required'));
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.TokenSignIn);

        // Get user from database
        const user = await userModel.findById(decoded.id).select('_id name email role status');

        if (!user) {
          logger.warn('Socket connection with invalid user', {
            socketId: socket.id,
            userId: decoded.id
          });
          return next(new Error('Invalid user'));
        }

        if (user.status !== 'active') {
          logger.warn('Socket connection attempt by inactive user', {
            socketId: socket.id,
            userId: user._id,
            status: user.status
          });
          return next(new Error('User account is not active'));
        }

        // Attach user info to socket
        socket.userId = user._id.toString();
        socket.userName = user.name;
        socket.userRole = user.role;

        logger.info('Socket authenticated successfully', {
          socketId: socket.id,
          userId: socket.userId,
          userName: socket.userName
        });

        next();
      } catch (error) {
        logger.error('Socket authentication error', {
          socketId: socket.id,
          error: error.message
        });

        if (error.name === 'JsonWebTokenError') {
          return next(new Error('Invalid token'));
        } else if (error.name === 'TokenExpiredError') {
          return next(new Error('Token expired'));
        } else {
          return next(new Error('Authentication failed'));
        }
      }
    });
  }

  setupEventHandlers() {
    this.io.on("connection", (socket) => {
      logger.info('User connected via Socket.IO', {
        socketId: socket.id,
        userId: socket.userId,
        userName: socket.userName
      });

      // Auto-register authenticated user
      this.registerUser(socket.userId, socket.id);

      // Emit connection success to client
      socket.emit("authenticated", {
        userId: socket.userId,
        userName: socket.userName,
        timestamp: new Date().toISOString()
      });

      socket.on("disconnect", (reason) => {
        this.handleDisconnect(socket.id, reason);
      });
    });
  }

  registerUser(userId, socketId) {
    this.onlineUsers.set(userId, socketId);
    logger.info('User registered as online', {
      userId,
      socketId,
      totalOnlineUsers: this.onlineUsers.size
    });

    // Broadcast updated online users count
    this.io.emit("onlineUsersCount", {
      count: this.onlineUsers.size,
      timestamp: new Date().toISOString()
    });
  }

  handleDisconnect(socketId, reason = 'unknown') {
    logger.info('Socket disconnecting', { socketId, reason });

    for (let [userId, userSocketId] of this.onlineUsers.entries()) {
      if (userSocketId === socketId) {
        this.onlineUsers.delete(userId);
        logger.info('User unregistered from online', {
          userId,
          socketId,
          totalOnlineUsers: this.onlineUsers.size
        });

        // Broadcast updated online users count
        this.io.emit("onlineUsersCount", {
          count: this.onlineUsers.size,
          timestamp: new Date().toISOString()
        });
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