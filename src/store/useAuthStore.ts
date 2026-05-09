import {create} from 'zustand';

interface AuthState {
  isAuthenticated: boolean;
  user: any | null;
  setAuthenticated: (value: boolean) => void;
  setUser: (user: any) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>(set => ({
  isAuthenticated: false,
  user: null,
  setAuthenticated: value => set({isAuthenticated: value}),
  setUser: user => set({user}),
  logout: () => set({isAuthenticated: false, user: null}),
}));
