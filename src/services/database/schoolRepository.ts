import {db, getFirstRow, getRows} from './db';

export interface School {
  id: number;
  name: string;
  created_at: string;
}

export const schoolRepository = {
  create: async (name: string): Promise<number> => {
    const createdAt = new Date().toISOString();
    const result = await db.execute(
      'INSERT INTO schools (name, created_at) VALUES (?, ?);',
      [name, createdAt],
    );
    return result.insertId!;
  },

  getById: async (id: number): Promise<School | null> => {
    const result = await db.execute('SELECT * FROM schools WHERE id = ?;', [id]);
    return getFirstRow<School>(result);
  },

  getAll: async (): Promise<School[]> => {
    const result = await db.execute('SELECT * FROM schools;');
    return getRows<School>(result);
  },

  update: async (id: number, name: string): Promise<void> => {
    await db.execute('UPDATE schools SET name = ? WHERE id = ?;', [name, id]);
  },

  delete: async (id: number): Promise<void> => {
    await db.execute('DELETE FROM schools WHERE id = ?;', [id]);
  },
};
