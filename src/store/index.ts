import { create } from 'zustand';

interface AppState {
  // App state will be defined here
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  isLoading: false,
  setLoading: (loading: boolean) => set({ isLoading: loading }),
}));

// Export settings store
export { useSettingsStore, initializeSettings } from './settingsStore';

// Export chat store
export { useChatStore } from './chatStore';
