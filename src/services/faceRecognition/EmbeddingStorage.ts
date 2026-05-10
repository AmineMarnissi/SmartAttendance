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
  embedding: Uint8Array | ArrayBuffer;
};

export const embeddingStorage = {
  save: async (
    studentId: number,
    embedding: Float32Array,
    quality?: number,
  ): Promise<void> => {
    const createdAt = new Date().toISOString();
    // Copy the Float32Array's buffer directly to save as a clean ArrayBuffer BLOB
    const bufferToSave = embedding.buffer.slice(
      embedding.byteOffset,
      embedding.byteOffset + embedding.byteLength,
    );

    await db.execute(
      'INSERT INTO face_embeddings (student_id, embedding, quality, created_at) VALUES (?, ?, ?, ?);',
      [studentId, bufferToSave, quality, createdAt],
    );
  },

  getByStudent: async (studentId: number): Promise<FaceEmbedding[]> => {
    const result = await db.execute(
      'SELECT * FROM face_embeddings WHERE student_id = ?;',
      [studentId],
    );
    return getRows<FaceEmbeddingRow>(result).map(row => {
      let buffer: ArrayBuffer;

      try {
        if (row.embedding instanceof Uint8Array) {
          const u8 = row.embedding as Uint8Array;
          buffer = u8.buffer.slice(
            u8.byteOffset,
            u8.byteOffset + u8.byteLength,
          );
        } else if (row.embedding instanceof ArrayBuffer) {
          buffer = row.embedding.slice(0);
        } else if (
          row.embedding &&
          (row.embedding as any).buffer instanceof ArrayBuffer
        ) {
          const u8 = new Uint8Array((row.embedding as any).buffer);
          buffer = u8.buffer.slice(
            u8.byteOffset,
            u8.byteOffset + u8.byteLength,
          );
        } else if (
          row.embedding &&
          typeof (row.embedding as any).byteLength === 'number'
        ) {
          // It's likely an ArrayBuffer that failed instanceof
          const rawBuffer = row.embedding as unknown as ArrayBuffer;
          const newBuffer = new ArrayBuffer(rawBuffer.byteLength);
          new Uint8Array(newBuffer).set(new Uint8Array(rawBuffer));
          buffer = newBuffer;
        } else if (
          Array.isArray(row.embedding) ||
          (row.embedding && typeof row.embedding === 'object')
        ) {
          buffer = new Uint8Array(Object.values(row.embedding)).buffer;
        } else {
          // Absolute fallback, create an empty 128-float buffer so it doesn't crash
          console.error(
            'Invalid embedding format from DB:',
            typeof row.embedding,
          );
          buffer = new ArrayBuffer(128 * 4);
        }

        // Ensure minimum size and 4-byte alignment
        if (buffer.byteLength % 4 !== 0) {
          const aligned = new ArrayBuffer(
            buffer.byteLength + (4 - (buffer.byteLength % 4)),
          );
          new Uint8Array(aligned).set(new Uint8Array(buffer));
          buffer = aligned;
        }
      } catch (e) {
        console.error('Failed to parse embedding buffer:', e);
        buffer = new ArrayBuffer(128 * 4);
      }

      return {
        ...row,
        student_id: row.student_id,
        embedding: new Float32Array(buffer),
      };
    });
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

    return getRows<ClassEmbeddingRow>(result).map(row => {
      let buffer: ArrayBuffer;

      try {
        if (row.embedding instanceof Uint8Array) {
          const u8 = row.embedding as Uint8Array;
          buffer = u8.buffer.slice(
            u8.byteOffset,
            u8.byteOffset + u8.byteLength,
          );
        } else if (row.embedding instanceof ArrayBuffer) {
          buffer = row.embedding.slice(0);
        } else if (
          row.embedding &&
          (row.embedding as any).buffer instanceof ArrayBuffer
        ) {
          const u8 = new Uint8Array((row.embedding as any).buffer);
          buffer = u8.buffer.slice(
            u8.byteOffset,
            u8.byteOffset + u8.byteLength,
          );
        } else if (
          row.embedding &&
          typeof (row.embedding as any).byteLength === 'number'
        ) {
          const rawBuffer = row.embedding as unknown as ArrayBuffer;
          const newBuffer = new ArrayBuffer(rawBuffer.byteLength);
          new Uint8Array(newBuffer).set(new Uint8Array(rawBuffer));
          buffer = newBuffer;
        } else if (
          Array.isArray(row.embedding) ||
          (row.embedding && typeof row.embedding === 'object')
        ) {
          buffer = new Uint8Array(Object.values(row.embedding)).buffer;
        } else {
          console.error(
            'Invalid embedding format from DB:',
            typeof row.embedding,
          );
          buffer = new ArrayBuffer(128 * 4);
        }

        if (buffer.byteLength % 4 !== 0) {
          const aligned = new ArrayBuffer(
            buffer.byteLength + (4 - (buffer.byteLength % 4)),
          );
          new Uint8Array(aligned).set(new Uint8Array(buffer));
          buffer = aligned;
        }
      } catch (e) {
        console.error('Failed to parse embedding buffer:', e);
        buffer = new ArrayBuffer(128 * 4);
      }

      return {
        studentId: row.student_id,
        embedding: new Float32Array(buffer),
      };
    });
  },

  deleteByStudent: async (studentId: number): Promise<void> => {
    await db.execute('DELETE FROM face_embeddings WHERE student_id = ?;', [
      studentId,
    ]);
  },
};
