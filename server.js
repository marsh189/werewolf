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

const createLobby = (name, cap, hostUser) => {
  return {
    name,
    hostUserId: hostUser.id,
    createdAt: Date.now(),
    started: false,
    cap: cap ?? 10,
    members: new Map(), // userId -> { userId, name, socketId, joinedAt }
  };
};

const publicLobbyView = ([lobbyName, lobby]) => {
  return {
    lobbyName,
    hostUserId: lobby.hostUserId,
    memberCount: lobby.members.size,
    started: lobby.started,
    cap: lobby.cap ?? null,
  };
};

const getOpenLobbies = () => {
  return [...lobbies.entries()]
    .filter(([, l]) => !l.started) // only joinable
    .map(publicLobbyView)
    .sort((a, b) => b.memberCount - a.memberCount);
};

const createMember = (user, socketId) => {
  return {
    userId: user.id,
    name: user.name ?? 'Player',
    socketId: socketId,
    joinedAt: Date.now(),
  };
};

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
        cap: lobby.cap,
      });

      return ack({ ok: true, lobbyName: name });
    });

    socket.on('createLobby', ({ lobbyName, cap }, callback) => {
      const name = String(lobbyName ?? '').trim();

      if (!name) {
        return callback({ ok: false, error: 'Invalid Lobby Name' });
      }

      const lobbyExists = io.sockets.adapter.rooms.has(name);

      if (lobbyExists) {
        return callback({ ok: false, error: 'Lobby Name Already Exists' });
      }

      const lobby = createLobby(name, cap, user);
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
        cap: lobby.cap,
      });

      io.emit('openLobbies', getOpenLobbies());

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
        cap: lobby.cap,
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
        return ack({ ok: false, error: 'Invalid Lobby Name' });
      }

      const name = lobbyName.trim();

      if (!name) {
        return ack({ ok: false, error: 'Invalid Lobby Name' });
      }

      const lobbyExists = io.sockets.adapter.rooms.has(name);

      if (!lobbyExists) {
        return ack({ ok: false, error: 'Lobby Does Not Exist' });
      }

      const current = userToLobby.get(user.id);
      if (!current || current !== name) {
        return ack({ ok: false, error: 'User has not joined this lobby' });
      }

      const lobby = lobbies.get(name);
      if (!lobby) return ack({ ok: false, error: 'Lobby metadata missing' });

      return ack({
        ok: true,
        lobbyInfo: {
          lobbyName: lobby.name,
          members: Array.from(lobby.members.values()).map((m) => ({
            userId: m.userId,
            name: m.name,
          })),
          hostUserId: lobby.hostUserId,
          started: lobby.started,
          cap: lobby.cap,
        },
      });
    });

    socket.on('list-open-lobbies', (_, callback) => {
      callback?.({ ok: true, lobbies: getOpenLobbies() });
    });

    socket.on('disconnect', () => {
      const lobbyName = userToLobby.get(user.id);
      if (!lobbyName) return;

      const lobby = lobbies.get(lobbyName);
      if (!lobby) return;

      lobby.members.delete(user.id);
      userToLobby.delete(user.id);

      if (lobby.members.size === 0) {
        lobbies.delete(lobbyName);
      }

      //new host if current host disconnects
      if (lobby.hostUserId === user.id && lobby.members.values().next()) {
        lobby.hostUserId = lobby.members.values().next().value.userId;
      }

      io.emit('openLobbies', getOpenLobbies());

      io.to(lobbyName).emit('update', {
        lobbyName,
        members: Array.from(lobby.members.values()).map((m) => ({
          userId: m.userId,
          name: m.name,
        })),
        hostUserId: lobby.hostUserId,
        started: lobby.started,
        cap: lobby.cap,
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
