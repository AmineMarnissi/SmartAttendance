import {db, getFirstRow, getRows} from './db';
import {Student} from '../../types/models';

export const studentRepository = {
  create: async (
    student: Omit<Student, 'id' | 'created_at' | 'active'>,
  ): Promise<number> => {
    const createdAt = new Date().toISOString();
    const result = await db.execute(
      'INSERT INTO students (student_code, first_name, last_name, date_of_birth, thumbnail, created_at) VALUES (?, ?, ?, ?, ?, ?);',
      [
        student.student_code,
        student.first_name,
        student.last_name,
        student.date_of_birth,
        student.thumbnail,
        createdAt,
      ],
    );
    return result.insertId!;
  },

  getById: async (id: number): Promise<Student | null> => {
    const result = await db.execute('SELECT * FROM students WHERE id = ?;', [
      id,
    ]);
    return getFirstRow<Student>(result);
  },

  getByCode: async (code: string): Promise<Student | null> => {
    const result = await db.execute(
      'SELECT * FROM students WHERE student_code = ?;',
      [code],
    );
    return getFirstRow<Student>(result);
  },

  getAllActive: async (): Promise<Student[]> => {
    const result = await db.execute('SELECT * FROM students WHERE active = 1;');
    return getRows<Student>(result);
  },

  update: async (
    id: number,
    student: Partial<Omit<Student, 'id' | 'created_at'>>,
  ): Promise<void> => {
    const fields = Object.keys(student);
    if (fields.length === 0) {
      return;
    }

    const query = `UPDATE students SET ${fields
      .map(f => `${f} = ?`)
      .join(', ')} WHERE id = ?;`;
    const params = [...Object.values(student), id];
    await db.execute(query, params);
  },

  delete: async (id: number): Promise<void> => {
    // Soft delete or hard delete? The schema suggests 'active' field.
    await db.execute('UPDATE students SET active = 0 WHERE id = ?;', [id]);
  },

  getForClass: async (classId: number): Promise<Student[]> => {
    const result = await db.execute(
      `
      SELECT s.* FROM students s
      JOIN enrollments e ON s.id = e.student_id
      WHERE e.class_id = ? AND s.active = 1;
    `,
      [classId],
    );
    return getRows<Student>(result);
  },
};
