export const formatLobbyMemberName = (rawName: string | null | undefined) => {
  const trimmed = String(rawName ?? '').trim();
  if (!trimmed) return 'Player';

  const normalized = trimmed.replace(/\s+/g, ' ');

  // Handle "Last, First" while keeping the common "First Last" case simple.
  if (normalized.includes(',')) {
    const afterComma = normalized.split(',')[1]?.trim();
    if (afterComma) return afterComma.split(' ')[0] ?? normalized;
  }

  return normalized.split(' ')[0] ?? normalized;
};

