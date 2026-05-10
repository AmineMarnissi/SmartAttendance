import {db, getFirstRow, getRows} from './db';
import {User} from '../../types/models';

export const userRepository = {
  create: async (user: Omit<User, 'id' | 'created_at'>): Promise<number> => {
    const createdAt = new Date().toISOString();
    const result = await db.execute(
      'INSERT INTO users (name, role, pin_hash, created_at) VALUES (?, ?, ?, ?);',
      [user.name.trim(), user.role, user.pin_hash, createdAt],
    );
    return result.insertId!;
  },

  getById: async (id: number): Promise<User | null> => {
    const result = await db.execute('SELECT * FROM users WHERE id = ?;', [id]);
    return getFirstRow<User>(result);
  },

  getByName: async (name: string): Promise<User | null> => {
    const result = await db.execute(
      'SELECT * FROM users WHERE lower(name) = lower(?) LIMIT 1;',
      [name.trim()],
    );
    return getFirstRow<User>(result);
  },

  getByRole: async (role: 'teacher' | 'admin'): Promise<User[]> => {
    const result = await db.execute('SELECT * FROM users WHERE role = ?;', [
      role,
    ]);
    return getRows<User>(result);
  },

  getAll: async (): Promise<User[]> => {
    const result = await db.execute('SELECT * FROM users ORDER BY role, name;');
    return getRows<User>(result);
  },

  updatePin: async (id: number, pinHash: string): Promise<void> => {
    await db.execute('UPDATE users SET pin_hash = ? WHERE id = ?;', [
      pinHash,
      id,
    ]);
  },

  delete: async (id: number): Promise<void> => {
    await db.execute('DELETE FROM users WHERE id = ?;', [id]);
  },
};
