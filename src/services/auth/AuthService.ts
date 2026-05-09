import bcrypt from 'bcryptjs';
import {userRepository} from '../database/userRepository';
import {useAuthStore} from '../../store/useAuthStore';

export const AuthService = {
  setupPin: async (
    name: string,
    role: 'teacher' | 'admin',
    pin: string,
  ): Promise<void> => {
    const salt = await bcrypt.genSalt(10);
    const pinHash = await bcrypt.hash(pin, salt);
    await userRepository.create({
      name,
      role,
      pin_hash: pinHash,
    });
  },

  login: async (name: string, pin: string): Promise<boolean> => {
    const users = await userRepository.getAll();
    const user = users.find(u => u.name === name);

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
