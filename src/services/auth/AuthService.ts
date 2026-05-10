import bcrypt from 'bcryptjs';
import {userRepository} from '../database/userRepository';
import {useAuthStore} from '../../store/useAuthStore';
import {User} from '../../types/models';

export type AuthRole = User['role'];

export const AuthService = {
  setupPin: async (
    name: string,
    role: AuthRole,
    pin: string,
  ): Promise<User> => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      throw new Error('User name is required.');
    }

    if (!/^\d{4,}$/.test(pin)) {
      throw new Error('PIN must contain at least 4 digits.');
    }

    const existing = await userRepository.getByName(trimmedName);
    if (existing) {
      throw new Error('A user with this name already exists.');
    }

    const salt = await bcrypt.genSalt(10);
    const pinHash = await bcrypt.hash(pin, salt);
    const id = await userRepository.create({
      name: trimmedName,
      role,
      pin_hash: pinHash,
    });

    const createdUser = await userRepository.getById(id);
    if (!createdUser) {
      throw new Error('User was created but could not be loaded.');
    }

    return createdUser;
  },

  login: async (name: string, pin: string): Promise<boolean> => {
    const user = await userRepository.getByName(name);

    if (!user) {
      return false;
    }

    const isValid = await bcrypt.compare(pin, user.pin_hash);
    if (isValid) {
      useAuthStore.getState().setUser(user);
      useAuthStore.getState().setAuthenticated(true);
      return true;
    }
    return false;
  },

  logout: () => {
    useAuthStore.getState().logout();
  },
};
