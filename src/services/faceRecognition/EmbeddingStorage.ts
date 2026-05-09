import {db, getRows} from '../database/db';
import {FaceEmbedding} from '../../types/models';

type FaceEmbeddingRow = {
  id: number;
  student_id: number;
  embedding: Uint8Array;
  quality?: number;
  created_at: string;
};

type ClassEmbeddingRow = {
  student_id: number;
  embedding: Uint8Array;
};

export const embeddingStorage = {
  save: async (
    studentId: number,
    embedding: Float32Array,
    quality?: number,
  ): Promise<void> => {
    const createdAt = new Date().toISOString();
    // Convert Float32Array to Uint8Array for SQLite BLOB
    const embeddingUint8 = new Uint8Array(
      embedding.buffer,
      embedding.byteOffset,
      embedding.byteLength,
    );

    await db.execute(
      'INSERT INTO face_embeddings (student_id, embedding, quality, created_at) VALUES (?, ?, ?, ?);',
      [studentId, embeddingUint8, quality, createdAt],
    );
  },

  getByStudent: async (studentId: number): Promise<FaceEmbedding[]> => {
    const result = await db.execute(
      'SELECT * FROM face_embeddings WHERE student_id = ?;',
      [studentId],
    );
    return getRows<FaceEmbeddingRow>(result).map(row => ({
      ...row,
      student_id: row.student_id,
      embedding: new Float32Array(
        row.embedding.buffer,
        row.embedding.byteOffset,
        row.embedding.byteLength / 4,
      ),
    }));
  },

  getAllForClass: async (
    classId: number,
  ): Promise<{studentId: number; embedding: Float32Array}[]> => {
    const result = await db.execute(
      `
      SELECT fe.student_id, fe.embedding
      FROM face_embeddings fe
      JOIN enrollments e ON fe.student_id = e.student_id
      WHERE e.class_id = ?;
    `,
      [classId],
    );

    return getRows<ClassEmbeddingRow>(result).map(row => ({
      studentId: row.student_id,
      embedding: new Float32Array(
        row.embedding.buffer,
        row.embedding.byteOffset,
        row.embedding.byteLength / 4,
      ),
    }));
  },

  deleteByStudent: async (studentId: number): Promise<void> => {
    await db.execute('DELETE FROM face_embeddings WHERE student_id = ?;', [
      studentId,
    ]);
  },
};
