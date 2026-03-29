/* =============================================================================
   Socket Event Contracts (Server)

   Keep all Socket.IO event names here to avoid drift between handlers.
   Payload shapes are documented inline next to each event.
============================================================================= */

export const CLIENT_EVENTS = {
  /* Lobby */
  JOIN_LOBBY: 'joinLobby',
  CREATE_LOBBY: 'createLobby',
  INITIATE_LOBBY: 'initiateLobby',
  LOBBY_VERIFY: 'lobby:verify',
  LOBBIES_LIST: 'lobbiesList',
  LEAVE_LOBBY: 'leaveLobby',
  START_GAME: 'startGame',
  END_GAME: 'endGame',
  LOBBY_UPDATE_SETTINGS: 'lobby:updateSettings',
  PRESENCE_SET_VIEW: 'presence:setView',

  /* Chat */
  CHAT_INIT: 'chat:init',
  CHAT_SEND: 'chat:send',

  /* Game */
  GAME_INIT: 'game:init',
  GAME_GET_NOTEBOOK: 'game:getNotebook',
  GAME_NIGHT_KILL: 'game:nightKill',
  GAME_FRAME: 'game:frame',
  GAME_PROWL: 'game:prowl',
  GAME_SNATCH: 'game:snatch',
  GAME_CURSE: 'game:curse',
  GAME_MIMIC: 'game:mimic',
  GAME_ESCORT_VISIT: 'game:escortVisit',
  GAME_BODYGUARD_GUARD: 'game:bodyguardGuard',
  GAME_DOCTOR_PROTECT: 'game:doctorProtect',
  GAME_TRACKER_WATCH: 'game:trackerWatch',
  GAME_LOOKOUT_WATCH: 'game:lookoutWatch',
  GAME_INVESTIGATE: 'game:investigate',
  GAME_TOGGLE_TRAPPER_ALERT: 'game:toggleTrapperAlert',
  GAME_CAST_VOTE: 'game:castVote',
  GAME_UPDATE_NOTEBOOK: 'game:updateNotebook',
  GAME_SET_PLAYER_ELIMINATED: 'game:setPlayerEliminated',
};

export const SERVER_EVENTS = {
  /* Lobby */
  LOBBY_UPDATE: 'update',
  LOBBIES_LIST: 'lobbiesList',

  /* Chat */
  CHAT_MESSAGE: 'chat:message',
};

