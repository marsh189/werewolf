const lobbies = new Map();
const userToLobby = new Map();

export const getLobby = (name) => lobbies.get(name);
export const setLobby = (name, lobby) => lobbies.set(name, lobby);
export const deleteLobby = (name) => lobbies.delete(name);
export const hasLobby = (name) => lobbies.has(name);
export const getLobbyEntries = () => lobbies.entries();

export const getUserLobby = (userId) => userToLobby.get(userId);
export const setUserLobby = (userId, lobbyName) => userToLobby.set(userId, lobbyName);
export const deleteUserLobby = (userId) => userToLobby.delete(userId);
