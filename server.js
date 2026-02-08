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
    startingAt: null,
    startTimeoutId: null,
    werewolfCount: 1,
    extraRoles: [],
    phaseDurations: {
      daySeconds: 60,
      nightSeconds: 60,
      voteSeconds: 30,
    },
    members: new Map(), // userId -> { userId, name, socketId, joinedAt }
  };
};

const buildLobbyInfo = (lobby) => {
  return {
    lobbyName: lobby.name,
    hostUserId: lobby.hostUserId,
    members: Array.from(lobby.members.values()).map((m) => ({
      userId: m.userId,
      name: m.name,
    })),
    started: lobby.started,
    startingAt: lobby.startingAt,
    werewolfCount: lobby.werewolfCount ?? 1,
    extraRoles: Array.isArray(lobby.extraRoles) ? lobby.extraRoles : [],
    phaseDurations: lobby.phaseDurations ?? {
      daySeconds: 60,
      nightSeconds: 60,
      voteSeconds: 30,
    },
  };
};

const publicLobbyView = ([lobbyName, lobby]) => {
  return {
    lobbyName,
    hostUserId: lobby.hostUserId,
    memberCount: lobby.members.size,
    started: lobby.started,
  };
};

const getLobbies = () => {
  return [...lobbies.entries()]
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

      joinLobby(lobby, io, socket);

      return ack({ ok: true, lobbyName: name });
    });

    socket.on('createLobby', ({ lobbyName }, callback) => {
      const name = String(lobbyName ?? '').trim();

      if (!name) {
        return callback({ ok: false, error: 'Invalid Lobby Name' });
      }

      const lobbyExists = io.sockets.adapter.rooms.has(name);

      if (lobbyExists) {
        return callback({ ok: false, error: 'Lobby Name Already Exists' });
      }

      const lobby = createLobby(name, user);
      joinLobby(lobby, io, socket);

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

      return ack({
        ok: true,
        lobbyInfo: buildLobbyInfo(lobby),
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
        lobbyInfo: buildLobbyInfo(lobby),
      });
    });

    socket.on('lobbiesList', (_, callback) => {
      callback?.({ ok: true, lobbies: getLobbies() });
    });

    socket.on('leaveLobby', (data) => {
      const { lobbyName } = data ?? {};

      if (!lobbyName || typeof lobbyName !== 'string') return;

      leaveLobby(lobbyName, io, socket);
    });

    socket.on('startGame', (data, callback) => {
      const ack = typeof callback === 'function' ? callback : () => {};
      const { lobbyName } = data ?? {};

      if (!lobbyName || typeof lobbyName !== 'string') {
        return ack({ ok: false, error: 'Invalid Lobby Name' });
      }

      const name = lobbyName.trim();
      const lobby = lobbies.get(name);
      if (!lobby) return ack({ ok: false, error: 'Lobby does not exist' });

      if (lobby.hostUserId !== user.id) {
        return ack({ ok: false, error: 'Only host can start the game' });
      }

      if (lobby.started) {
        return ack({ ok: false, error: 'Game already started' });
      }

      const startingAt = Date.now() + 5000;
      lobby.startingAt = startingAt;

      if (lobby.startTimeoutId) {
        clearTimeout(lobby.startTimeoutId);
      }

      lobby.startTimeoutId = setTimeout(() => {
        lobby.started = true;
        lobby.startingAt = null;
        io.to(lobby.name).emit('update', buildLobbyInfo(lobby));
      }, 5000);

      io.to(lobby.name).emit('update', buildLobbyInfo(lobby));
      return ack({ ok: true, startingAt });
    });

    socket.on('lobby:updateSettings', (data, callback) => {
      const ack = typeof callback === 'function' ? callback : () => {};
      const { lobbyName, werewolfCount, extraRoles, phaseDurations } =
        data ?? {};

      if (!lobbyName || typeof lobbyName !== 'string') {
        return ack({ ok: false, error: 'Invalid Lobby Name' });
      }

      const name = lobbyName.trim();
      const lobby = lobbies.get(name);
      if (!lobby) return ack({ ok: false, error: 'Lobby does not exist' });

      if (lobby.hostUserId !== user.id) {
        return ack({ ok: false, error: 'Only host can update settings' });
      }

      const count = Math.max(1, Number(werewolfCount) || 1);
      const roles = Array.isArray(extraRoles)
        ? extraRoles.filter((r) => typeof r === 'string')
        : [];
      const uniqueRoles = Array.from(new Set(roles));

      lobby.werewolfCount = count;
      lobby.extraRoles = uniqueRoles;
      if (phaseDurations && typeof phaseDurations === 'object') {
        const daySeconds = Math.max(
          60,
          Number(phaseDurations.daySeconds) || 60,
        );
        const nightSeconds = Math.max(
          60,
          Number(phaseDurations.nightSeconds) || 60,
        );
        const voteSeconds = Math.max(
          1,
          Number(phaseDurations.voteSeconds) || 30,
        );
        lobby.phaseDurations = { daySeconds, nightSeconds, voteSeconds };
      }

      io.to(lobby.name).emit('update', buildLobbyInfo(lobby));

      return ack({ ok: true });
    });

    socket.on('disconnect', () => {
      const lobbyName = userToLobby.get(user.id);
      if (!lobbyName) return;

      leaveLobby(lobbyName, io, socket);
    });
  });

  const leaveLobby = (lobbyName, io, socket) => {
    const user = socket.data.user;
    if (!lobbyName) return;

    const lobby = lobbies.get(lobbyName);
    if (!lobby) return;

    socket.leave(lobby.name);
    lobby.members.delete(user.id);
    userToLobby.delete(user.id);

    if (lobby.members.size === 0) {
      lobbies.delete(lobbyName);
    }

    //new host if current host disconnects
    if (
      lobby.hostUserId === user.id &&
      lobby.members.size > 0 &&
      lobby.members.values().next()
    ) {
      lobby.hostUserId = lobby.members.values().next().value.userId;
    }
    console.log(`🟢 ${socket.id} (${user?.email}) left lobby ${lobby.name}`);

    io.emit('lobbiesList', getLobbies());

    io.to(lobbyName).emit('update', {
      ...buildLobbyInfo(lobby),
    });
  };

  const joinLobby = (lobby, io, socket) => {
    const user = socket.data.user;
    lobby.members.set(user.id, createMember(user, socket.id));
    lobbies.set(lobby.name, lobby);
    userToLobby.set(user.id, lobby.name);

    socket.join(lobby.name);

    console.log(`🟢 ${socket.id} (${user?.email}) joined lobby ${lobby.name}`);

    io.to(lobby.name).emit('update', {
      ...buildLobbyInfo(lobby),
    });

    io.emit('lobbiesList', getLobbies());
  };

  httpServer
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});
