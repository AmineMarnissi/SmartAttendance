import {create} from 'zustand';
import {User} from '../types/models';

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  setAuthenticated: (value: boolean) => void;
  setUser: (user: User | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>(set => ({
  isAuthenticated: false,
  user: null,
  setAuthenticated: value => set({isAuthenticated: value}),
  setUser: user => set({user}),
  logout: () => set({isAuthenticated: false, user: null}),
}));
