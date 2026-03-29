# Server Overview

This project runs a Next.js app with a lightweight Socket.IO server (`server.js`).
All server-side game logic lives under `server/`.

## Start Here

If you're new to the server code, these are the best entrypoints:

- `server.js`: boots the Socket.IO server and wires middleware/auth.
- `server/socket/socketHandlers.js`: registers all socket handler modules.
- `server/socket/handlers/`: event handlers (validate input + write to lobby state).
- `server/services/lobby/engine/phaseService.js`: the phase engine composition root (day/night/vote loop).
- `server/services/game/nightResolution/nightResolutionService.js`: end-of-night resolver (applies effects atomically).

## Directory Layout

- `server/socket/`
  - `socketAuth.js`: attaches `socket.data.user` via NextAuth JWT
  - `socketHandlers.js`: wires up the per-feature handler modules
  - `events.js`: central event-name registry (server is source of truth)
  - `handlers/`: Socket.IO event handlers (validate + write to lobby state)
- `server/services/`
  - `lobbyService.js`: facade re-exporting `server/services/lobby/*` (readability split)
  - `lobby/`: lobby modules (phase engine, lifecycle, membership, reset, timeouts)
  - `chatService.js`: facade re-exporting `server/services/chat/*`
  - `chat/`: chat history + audience gating + per-recipient emits
  - `presenceService.js`: facade re-exporting `server/services/presence/*`
  - `presence/`: tracks who is viewing lobby/game/results
  - `lobbyEmitService.js`: emits lobby updates + lobby list updates
  - `lobbyInfoService.js`: builds the public JSON payloads sent to clients
  - `actionThrottleService.js`: protects against spammy client events
  - `lobbyCleanupService.js`: removes all references to a leaving user
  - `game/`: game-specific services (role assignment, night resolution, etc.)
    - `nightResolutionService.js`: facade re-exporting `server/services/game/nightResolution/*`
    - `nightResolution/`: night resolver + support helpers (notices, interactions, result messages)
- `server/state/`
  - `state.js`: in-memory lobby/user lookup tables
  - `constants.js`: game timing constants + defaults
- `server/validation/`
  - `validators.js`: user-input parsing/sanitization for socket payloads

## Import Conventions

To keep imports predictable as the server grows:

- Socket handlers should usually import from `server/services/index.js` (public API surface).
- Service modules can import sibling modules directly (keeps dependencies explicit and avoids barrel cycles).
- Facade files like `server/services/lobbyService.js` exist to keep older imports working and to provide a stable entrypoint.

## Lobby State Model

The lobby is an in-memory object stored in `server/state/state.js`.

Important characteristics:
- Uses `Map` / `Set` for server-side convenience (membership, votes, pending actions).
- Anything sent to clients must be converted to JSON-friendly structures.
  We do that in `server/services/lobbyInfoService.js`.

## Game Flow (High Level)

1. Client joins / creates lobby -> `server/socket/handlers/lobbyHandlers.js`
2. Host starts game -> `scheduleGameStart` in `server/services/lobby/lifecycle/lifecycleService.js`
3. Phase engine advances: day -> night -> results -> vote -> elimination results -> ...
4. Client actions write "pending" selections (Maps/Sets). The end-of-night resolver
   computes deaths + investigative feedback in one place:
   `server/services/game/nightResolutionService.js`.
