'use client';

import {
  createContext,
  useContext,
  useMemo,
  useState,
} from 'react';

type SoundSettingsContextValue = {
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  toggleSoundEnabled: () => void;
};

const SOUND_SETTINGS_STORAGE_KEY = 'nightfall-sound-enabled';

const SoundSettingsContext = createContext<SoundSettingsContextValue | null>(null);

export function SoundSettingsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [soundEnabled, setSoundEnabledState] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.localStorage.getItem(SOUND_SETTINGS_STORAGE_KEY) !== 'false';
  });

  const setSoundEnabled = (enabled: boolean) => {
    setSoundEnabledState(enabled);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(
        SOUND_SETTINGS_STORAGE_KEY,
        enabled ? 'true' : 'false',
      );
    }
  };

  const value = useMemo(
    () => ({
      soundEnabled,
      setSoundEnabled,
      toggleSoundEnabled: () => setSoundEnabled(!soundEnabled),
    }),
    [soundEnabled],
  );

  return (
    <SoundSettingsContext.Provider value={value}>
      {children}
    </SoundSettingsContext.Provider>
  );
}

export function useSoundSettings() {
  const context = useContext(SoundSettingsContext);
  if (!context) {
    throw new Error('useSoundSettings must be used within SoundSettingsProvider');
  }
  return context;
}
