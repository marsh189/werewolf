import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { io as createClient } from 'socket.io-client';
import { registerLobbyHandlers } from './handlers/lobbyHandlers.js';
import { registerGameHandlers } from './handlers/gameHandlers.js';
import { registerChatHandlers } from './handlers/chatHandlers.js';
import { CLIENT_EVENTS } from './events.js';
import { getLobby } from '../state/state.js';

const createUser = (seed) => ({
  id: `test-user-${seed}`,
  name: `Test User ${seed}`,
  email: `test-${seed}@example.com`,
});

const connectClient = async ({ port, user }) => {
  const socket = createClient(`http://localhost:${port}`, {
    transports: ['websocket'],
    forceNew: true,
    auth: {
      userId: user.id,
      name: user.name,
      email: user.email,
    },
  });

  await new Promise((resolve, reject) => {
    const onConnect = () => resolve(undefined);
    const onError = (err) => reject(err);
    socket.once('connect', onConnect);
    socket.once('connect_error', onError);
  });

  return socket;
};

const emitAck = (socket, event, payload) =>
  new Promise((resolve) => {
    socket.emit(event, payload, (response) => resolve(response));
  });

describe('Socket contract (auth bypassed for tests)', () => {
  /** @type {import('node:http').Server | null} */
  let httpServer = null;
  /** @type {import('socket.io').Server | null} */
  let io = null;
  /** @type {number} */
  let port = 0;
  /** @type {import('socket.io-client').Socket | null} */
  let clientA = null;
  /** @type {import('socket.io-client').Socket | null} */
  let clientB = null;

  beforeEach(async () => {
    httpServer = createServer((_, res) => {
      res.writeHead(404);
      res.end();
    });

    io = new Server(httpServer, {
      transports: ['websocket'],
    });

    io.on('connection', (socket) => {
      const auth = socket.handshake.auth ?? {};
      const user = {
        id: typeof auth.userId === 'string' ? auth.userId : 'test-user',
        name: typeof auth.name === 'string' ? auth.name : 'Test User',
        email: typeof auth.email === 'string' ? auth.email : 'test@example.com',
      };
      socket.data.user = user;

      registerLobbyHandlers({ io, socket, user });
      registerGameHandlers({ io, socket, user });
      registerChatHandlers({ io, socket, user });
    });

    await new Promise((resolve) => {
      httpServer.listen(0, () => resolve(undefined));
    });

    port = httpServer.address().port;
  });

  afterEach(async () => {
    if (clientA) clientA.disconnect();
    if (clientB) clientB.disconnect();

    await new Promise((resolve) => {
      if (!io) return resolve(undefined);
      io.close(() => resolve(undefined));
    });

    await new Promise((resolve) => {
      if (!httpServer) return resolve(undefined);
      httpServer.close(() => resolve(undefined));
    });

    clientA = null;
    clientB = null;
    io = null;
    httpServer = null;
  });

  it('createLobby: rejects invalid lobby names', async () => {
    clientA = await connectClient({ port, user: createUser('a') });

    const response = await emitAck(clientA, CLIENT_EVENTS.CREATE_LOBBY, {
      lobbyName: '   ',
    });

    expect(response).toEqual({ ok: false, error: 'Invalid Lobby Name' });
  });

  it('createLobby -> game:init: returns an ok payload for a member', async () => {
    const lobbyName = `test-lobby-${Date.now()}`;
    clientA = await connectClient({ port, user: createUser('a') });

    const created = await emitAck(clientA, CLIENT_EVENTS.CREATE_LOBBY, { lobbyName });
    expect(created).toEqual({ ok: true, lobbyName });

    const init = await emitAck(clientA, CLIENT_EVENTS.GAME_INIT, { lobbyName });
    expect(init.ok).toBe(true);
    expect(init.game).toBeTruthy();
    expect(typeof init.game.phase).toBe('string');
  });

  it('chat:send: validates channel + throttles rapid sends', async () => {
    const lobbyName = `test-lobby-${Date.now()}`;
    clientA = await connectClient({ port, user: createUser('a') });

    const created = await emitAck(clientA, CLIENT_EVENTS.CREATE_LOBBY, { lobbyName });
    expect(created).toEqual({ ok: true, lobbyName });

    const lobby = getLobby(lobbyName);
    expect(lobby).toBeTruthy();
    lobby.started = true;
    lobby.gamePhase = 'day';

    const invalidChannel = await emitAck(clientA, CLIENT_EVENTS.CHAT_SEND, {
      lobbyName,
      channel: 'not-a-channel',
      content: 'Hello',
    });
    expect(invalidChannel).toEqual({ ok: false, error: 'Invalid chat channel' });

    const first = await emitAck(clientA, CLIENT_EVENTS.CHAT_SEND, {
      lobbyName,
      channel: 'village',
      content: 'Hello',
    });
    expect(first.ok).toBe(true);

    const second = await emitAck(clientA, CLIENT_EVENTS.CHAT_SEND, {
      lobbyName,
      channel: 'village',
      content: 'Hello again',
    });
    expect(second).toEqual({ ok: true, throttled: true });
  });

  it('game:castVote: rejects outside vote phase; succeeds in vote phase', async () => {
    const lobbyName = `test-lobby-${Date.now()}`;
    const userA = createUser('a');
    const userB = createUser(`b-${lobbyName}`);
    clientA = await connectClient({ port, user: userA });
    clientB = await connectClient({ port, user: userB });

    const created = await emitAck(clientA, CLIENT_EVENTS.CREATE_LOBBY, { lobbyName });
    expect(created).toEqual({ ok: true, lobbyName });

    const joined = await emitAck(clientB, CLIENT_EVENTS.JOIN_LOBBY, { lobbyName });
    expect(joined).toEqual({ ok: true, lobbyName });

    const lobby = getLobby(lobbyName);
    expect(lobby).toBeTruthy();

    lobby.gamePhase = 'day';
    const notVote = await emitAck(clientA, CLIENT_EVENTS.GAME_CAST_VOTE, {
      lobbyName,
      targetUserId: userB.id,
    });
    expect(notVote).toEqual({ ok: false, error: 'Not in voting phase' });

    lobby.gamePhase = 'vote';
    const first = await emitAck(clientA, CLIENT_EVENTS.GAME_CAST_VOTE, {
      lobbyName,
      targetUserId: userB.id,
    });
    expect(first).toEqual({ ok: true });

    await new Promise((resolve) => setTimeout(resolve, 300));

    const second = await emitAck(clientA, CLIENT_EVENTS.GAME_CAST_VOTE, {
      lobbyName,
      targetUserId: userB.id,
    });
    expect(second).toEqual({ ok: true, cleared: true });
  });

  it('presence:setView: rejects invalid view', async () => {
    const lobbyName = `test-lobby-${Date.now()}`;
    clientA = await connectClient({ port, user: createUser('a') });

    const created = await emitAck(clientA, CLIENT_EVENTS.CREATE_LOBBY, { lobbyName });
    expect(created).toEqual({ ok: true, lobbyName });

    const response = await emitAck(clientA, CLIENT_EVENTS.PRESENCE_SET_VIEW, {
      lobbyName,
      view: 'invalid',
    });
    expect(response).toEqual({ ok: false, error: 'Invalid view' });
  });

  it('lobby:updateSettings: host-only and applies sanitized settings', async () => {
    const lobbyName = `test-lobby-${Date.now()}`;
    clientA = await connectClient({ port, user: createUser('a') });
    clientB = await connectClient({ port, user: createUser(`b-${lobbyName}`) });

    const created = await emitAck(clientA, CLIENT_EVENTS.CREATE_LOBBY, { lobbyName });
    expect(created).toEqual({ ok: true, lobbyName });

    const joined = await emitAck(clientB, CLIENT_EVENTS.JOIN_LOBBY, { lobbyName });
    expect(joined).toEqual({ ok: true, lobbyName });

    const nonHost = await emitAck(clientB, CLIENT_EVENTS.LOBBY_UPDATE_SETTINGS, {
      lobbyName,
      werewolfCount: 2,
      specialRolesEnabled: true,
      neutralRolesEnabled: true,
      phaseDurations: { daySeconds: 1, nightSeconds: 1, voteSeconds: 1 },
    });
    expect(nonHost).toEqual({ ok: false, error: 'Only host can update settings' });

    const host = await emitAck(clientA, CLIENT_EVENTS.LOBBY_UPDATE_SETTINGS, {
      lobbyName,
      werewolfCount: 2,
      specialRolesEnabled: true,
      neutralRolesEnabled: true,
      phaseDurations: { daySeconds: 1, nightSeconds: 1, voteSeconds: 1 },
    });
    expect(host).toEqual({ ok: true });

    const lobby = getLobby(lobbyName);
    expect(lobby).toBeTruthy();
    // Sanitizer clamps to min 10 seconds.
    expect(lobby.phaseDurations.daySeconds).toBeGreaterThanOrEqual(10);
    expect(lobby.phaseDurations.nightSeconds).toBeGreaterThanOrEqual(10);
    expect(lobby.phaseDurations.voteSeconds).toBeGreaterThanOrEqual(10);
  });

  it('lobby:updateDisplayName: allows members to update their lobby display name', async () => {
    const lobbyName = `test-lobby-${Date.now()}`;
    const userA = createUser('a');
    clientA = await connectClient({ port, user: userA });

    const created = await emitAck(clientA, CLIENT_EVENTS.CREATE_LOBBY, { lobbyName });
    expect(created).toEqual({ ok: true, lobbyName });

    const response = await emitAck(clientA, CLIENT_EVENTS.LOBBY_UPDATE_DISPLAY_NAME, {
      lobbyName,
      displayName: 'New Name',
    });
    expect(response).toEqual({ ok: true });

    const lobby = getLobby(lobbyName);
    expect(lobby).toBeTruthy();
    expect(lobby.members.get(userA.id)?.name).toBe('New Name');
  });

  it('game:getNotebook: only day/night and only dead targets', async () => {
    const lobbyName = `test-lobby-${Date.now()}`;
    const userA = createUser('a');
    const userB = createUser(`b-${lobbyName}`);
    clientA = await connectClient({ port, user: userA });
    clientB = await connectClient({ port, user: userB });

    const created = await emitAck(clientA, CLIENT_EVENTS.CREATE_LOBBY, { lobbyName });
    expect(created).toEqual({ ok: true, lobbyName });

    const joined = await emitAck(clientB, CLIENT_EVENTS.JOIN_LOBBY, { lobbyName });
    expect(joined).toEqual({ ok: true, lobbyName });

    const lobby = getLobby(lobbyName);
    expect(lobby).toBeTruthy();
    lobby.started = true;

    lobby.gamePhase = 'vote';
    const wrongPhase = await emitAck(clientA, CLIENT_EVENTS.GAME_GET_NOTEBOOK, {
      lobbyName,
      targetUserId: userB.id,
    });
    expect(wrongPhase).toEqual({ ok: false, error: 'Not available in current phase' });

    lobby.gamePhase = 'day';
    const targetAlive = await emitAck(clientA, CLIENT_EVENTS.GAME_GET_NOTEBOOK, {
      lobbyName,
      targetUserId: userB.id,
    });
    expect(targetAlive).toEqual({
      ok: false,
      error: 'Notebook can only be viewed for dead players',
    });

    lobby.eliminatedUserIds = lobby.eliminatedUserIds ?? new Set();
    lobby.eliminatedUserIds.add(userB.id);
    lobby.playerNotebooks = lobby.playerNotebooks ?? new Map();
    lobby.playerNotebooks.set(userB.id, 'final notes');

    const ok = await emitAck(clientA, CLIENT_EVENTS.GAME_GET_NOTEBOOK, {
      lobbyName,
      targetUserId: userB.id,
    });
    expect(ok.ok).toBe(true);
    expect(ok.notebook?.userId).toBe(userB.id);
    expect(ok.notebook?.content).toBe('final notes');
  });
});
