import { createServer } from 'node:http';
import next from 'next';
import { Server } from 'socket.io';
import { getToken } from 'next-auth/jwt';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;

const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

const lobbies = new Map();
const userToLobby = new Map(); //This prevents a user being in two lobbies at once

console.log('🔥 SERVER.JS FILE LOADED');

const createLobby = (name, hostUser) => {
  return {
    name,
    hostUserId: hostUser.id,
    createdAt: Date.now(),
    started: false,
    members: new Map(), // userId -> { userId, name, socketId, joinedAt }
  };
};

const createMember = (user, socketId) => {
  return {
    userId: user.id,
    name: user.name ?? 'Player',
    socketId: socketId,
    joinedAt: Date.now(),
  };
};

const makeLobbyView = (lobby) => {};

app.prepare().then(() => {
  const httpServer = createServer(handler);

  const io = new Server(httpServer, {
    // optional: helps avoid polling spam (still allows upgrade)
    transports: ['polling', 'websocket'],
  });

  // ✅ Auth middleware: runs BEFORE "connection"
  io.use(async (socket, next) => {
    try {
      const token = await getToken({
        req: socket.request, // contains cookies
        secret: process.env.AUTH_SECRET, // must match your NextAuth secret
      });

      if (!token) return next(new Error('UNAUTHORIZED'));

      socket.data.user = {
        id: token.sub,
        email: token.email,
        name: token.name,
      };

      return next();
    } catch (err) {
      console.error('Socket auth error:', err);
      return next(new Error('UNAUTHORIZED'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user;
    console.log('🟢 connected:', socket.id, 'user:', user);

    socket.on('joinLobby', (data, callback) => {
      const ack = typeof callback === 'function' ? callback : () => {};

      const { lobbyName } = data ?? {};

      if (!lobbyName || typeof lobbyName !== 'string') {
        return ack({ ok: false, error: 'Invalid Lobby Name' });
      }

      const name = lobbyName.trim();
      if (!name) {
        return ack({ ok: false, error: 'Invalid Lobby Name' });
      }

      const lobby = lobbies.get(name);
      if (!lobby) return ack({ ok: false, error: 'Lobby does not exist' });
      if (lobby.started)
        return ack({ ok: false, error: 'Game already started' });

      const current = userToLobby.get(user.id);
      if (current && current !== name) {
        return ack({ ok: false, error: 'Already in another lobby' });
      }

      lobby.members.set(user.id, createMember(user, socket.id));
      userToLobby.set(name);

      socket.join(name);

      console.log(`🟢 ${socket.id} (${user?.email}) joined lobby ${name}`);

      io.to(name).emit('update', {
        lobbyName: name,
        members: Array.from(lobby.members.values()).map((m) => ({
          userId: m.userId,
          name: m.name,
        })),
        hostUserId: lobby.hostUserId,
        started: lobby.started,
      });

      return ack({ ok: true, lobbyName: name });
    });

    socket.on('createLobby', (data, callback) => {
      const { lobbyName } = data ?? {};

      //field name is required, so we should never get to this point
      if (!lobbyName || typeof lobbyName !== 'string') {
        return callback({ ok: false, error: 'Invalid Lobby Name' });
      }

      const name = lobbyName.trim();

      if (!name) {
        return callback({ ok: false, error: 'Invalid Lobby Name' });
      }

      const lobbyExists = io.sockets.adapter.rooms.has(name);

      if (lobbyExists) {
        return callback({ ok: false, error: 'Lobby Name Already Exists' });
      }

      const lobby = createLobby(name, user);
      lobby.members.set(user.id, createMember(user, socket.id));
      lobbies.set(name, lobby);
      userToLobby.set(user.id, name);

      socket.join(name);

      console.log(`🟢 ${socket.id} (${user?.email}) joined lobby ${name}`);

      io.to(name).emit('update', {
        lobbyName: name,
        members: Array.from(lobby.members.values()).map((m) => ({
          userId: m.userId,
          name: m.name,
        })),
        hostUserId: lobby.hostUserId,
        started: lobby.started,
      });

      return callback({ ok: true, lobbyName: name });
    });

    socket.on('initiateLobby', (data, callback) => {
      const ack = typeof callback === 'function' ? callback : () => {};
      const { lobbyName } = data ?? {};

      if (!lobbyName || typeof lobbyName !== 'string') {
        return ack({ ok: false, error: 'Invalid Lobby Name' });
      }

      const name = lobbyName.trim();

      const lobby = lobbies.get(name);

      if (!lobby || !lobby.members.has(user.id)) {
        return ack({ ok: false, error: 'Invalid lobby name' });
      }

      const lobbyInfo = {
        lobbyName: lobby.name,
        hostUserId: lobby.hostUserId,
        members: Array.from(lobby.members.values()).map((m) => ({
          userId: m.userId,
          name: m.name,
        })),
        started: lobby.started,
      };

      return ack({
        ok: true,
        lobbyInfo,
      });
    });

    socket.on('lobby:verify', (data, callback) => {
      const ack = typeof callback === 'function' ? callback : () => {};
      const { lobbyName } = data ?? {};

      if (!lobbyName || typeof lobbyName !== 'string') {
        return callback({ ok: false, error: 'Invalid Lobby Name' });
      }

      const name = lobbyName.trim();

      if (!name) {
        return callback({ ok: false, error: 'Invalid Lobby Name' });
      }

      const lobbyExists = io.sockets.adapter.rooms.has(name);

      if (!lobbyExists) {
        return callback({ ok: false, error: 'Lobby Does Not Exist' });
      }

      const current = userToLobby.get(user.id);
      if (current || current !== name) {
        return cb({ ok: false, error: 'User has not joined this lobby' });
      }

      return callback({
        ok: true,
        lobbyInfo: {
          lobbyName,
          members: Array.from(lobby.members.values()).map((m) => ({
            userId: m.userId,
            name: m.name,
          })),
          hostUserId: lobby.hostUserId,
          started: lobby.started,
        },
      });
    });

    socket.on('disconnect', () => {
      const lobbyName = userToLobby.get(user.id);
      if (!lobbyName) return;

      const lobby = lobbies.get(name);
      if (!lobby) return;

      lobby.members.delete(user.id);
      userToLobby.delete(user.id);

      if (lobby.members.size === 0) {
        lobbies.delete(lobbyName);
        return;
      }

      //new host if current host disconnects
      if (lobby.hostUserId === user.id) {
        lobby.hostUserId = lobby.members.values().next().value.id;
      }

      io.to(lobbyName).emit('update', {
        lobbyName,
        members: Array.from(lobby.members.values()).map((m) => ({
          userId: m.userId,
          name: m.name,
        })),
        hostUserId: lobby.hostUserId,
        started: lobby.started,
      });
    });
  });

  httpServer
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});
