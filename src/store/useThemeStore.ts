import { create } from 'zustand';

interface ThemeState {
  isDarkMode: boolean;
  toggleTheme: () => void;
  setTheme: (isDark: boolean) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  isDarkMode: true, // Default to dark mode
  toggleTheme: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
  setTheme: (isDark) => set({ isDarkMode: isDark }),
}));
