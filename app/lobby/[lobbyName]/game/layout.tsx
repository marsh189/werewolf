'use client';

import { LobbySessionGuard } from '@/components/lobby/LobbySessionGuard';

/* =============================================================================
   Game Route Layout

   Wraps `/lobby/[lobbyName]/game` with `LobbySessionGuard` to ensure:
   - authenticated session exists
   - socket is connected
   - user is allowed to view the lobby
============================================================================= */
export default function GameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LobbySessionGuard>{children}</LobbySessionGuard>;
}
