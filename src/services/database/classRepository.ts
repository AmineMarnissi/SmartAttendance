import {db, getFirstRow, getRows} from './db';
import {Class} from '../../types/models';

export const classRepository = {
  create: async (cls: Omit<Class, 'id' | 'created_at'>): Promise<number> => {
    const createdAt = new Date().toISOString();
    const result = await db.execute(
      'INSERT INTO classes (name, grade, school_id, teacher_id, schedule, created_at) VALUES (?, ?, ?, ?, ?, ?);',
      [
        cls.name,
        cls.grade,
        cls.school_id,
        cls.teacher_id,
        cls.schedule,
        createdAt,
      ],
    );
    return result.insertId!;
  },

  getById: async (id: number): Promise<Class | null> => {
    const result = await db.execute('SELECT * FROM classes WHERE id = ?;', [
      id,
    ]);
    return getFirstRow<Class>(result);
  },

  getAll: async (): Promise<Class[]> => {
    const result = await db.execute('SELECT * FROM classes;');
    return getRows<Class>(result);
  },

  getByTeacher: async (teacherId: number): Promise<Class[]> => {
    const result = await db.execute(
      'SELECT * FROM classes WHERE teacher_id = ?;',
      [teacherId],
    );
    return getRows<Class>(result);
  },

  update: async (
    id: number,
    cls: Partial<Omit<Class, 'id' | 'created_at'>>,
  ): Promise<void> => {
    const fields = Object.keys(cls);
    if (fields.length === 0) {
      return;
    }

    const query = `UPDATE classes SET ${fields
      .map(f => `${f} = ?`)
      .join(', ')} WHERE id = ?;`;
    const params = [...Object.values(cls), id];
    await db.execute(query, params);
  },

  delete: async (id: number): Promise<void> => {
    await db.execute('DELETE FROM classes WHERE id = ?;', [id]);
  },

  enrollStudent: async (studentId: number, classId: number): Promise<void> => {
    const enrolledAt = new Date().toISOString();
    await db.execute(
      'INSERT OR IGNORE INTO enrollments (student_id, class_id, enrolled_at) VALUES (?, ?, ?);',
      [studentId, classId, enrolledAt],
    );
  },

  unenrollStudent: async (
    studentId: number,
    classId: number,
  ): Promise<void> => {
    await db.execute(
      'DELETE FROM enrollments WHERE student_id = ? AND class_id = ?;',
      [studentId, classId],
    );
  },
};
