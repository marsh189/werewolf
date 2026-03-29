'use client';

import { LobbySessionGuard } from '@/components/lobby/LobbySessionGuard';

/* =============================================================================
   Lobby Route Layout

   Wraps all `/lobby/[lobbyName]/*` routes with `LobbySessionGuard` so pages:
   - stay UI-focused
   - don't duplicate auth + lobby verification logic
============================================================================= */
export default function LobbyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LobbySessionGuard>{children}</LobbySessionGuard>;
}
