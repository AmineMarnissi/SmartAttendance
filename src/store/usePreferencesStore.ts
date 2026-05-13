import {create} from 'zustand';
import {AppLanguage, TranslationKey, translate} from '../services/i18n/i18n';

export type AppThemeMode = 'light' | 'dark';

interface PreferencesState {
  language: AppLanguage;
  themeMode: AppThemeMode;
  setLanguage: (language: AppLanguage) => void;
  setThemeMode: (themeMode: AppThemeMode) => void;
  t: (key: TranslationKey) => string;
}

export const usePreferencesStore = create<PreferencesState>((set, get) => ({
  language: 'en',
  themeMode: 'light',
  setLanguage: language => set({language}),
  setThemeMode: themeMode => set({themeMode}),
  t: key => translate(get().language, key),
}));
