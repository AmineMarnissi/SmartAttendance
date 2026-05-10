import {open, type QueryResult} from '@op-engineering/op-sqlite';

type DbValue = string | number | boolean | null | ArrayBuffer | Uint8Array;

export type DbRow = Record<string, DbValue>;
export type DbQueryResult = Omit<QueryResult, 'rows'> & {
  rows: DbRow[];
};

type DbParam = DbValue | undefined;

const sqlite = open({
  name: 'SmartAttendance.db',
});

const normalizeParams = (params: DbParam[] = []): DbValue[] =>
  params.map(param => (param === undefined ? null : param));

export const db = {
  execute: async (
    query: string,
    params: DbParam[] = [],
  ): Promise<DbQueryResult> => {
    const result = await sqlite.execute(query, normalizeParams(params));
    return {
      ...result,
      rows: result.rows?._array ?? [],
    };
  },
};

export const getRows = <TRow extends object = DbRow>(
  result: DbQueryResult,
): TRow[] => result.rows as unknown as TRow[];

export const getFirstRow = <TRow extends object = DbRow>(
  result: DbQueryResult,
): TRow | null => (result.rows[0] as unknown as TRow | undefined) ?? null;

export const DB_VERSION = 2; // Increment to force wipe corrupt embedding data

export const initDatabase = async () => {
  try {
    // Enable foreign keys
    await db.execute('PRAGMA foreign_keys = ON;');

    // Check DB version — wipe all data if version changed (clears corrupt BLOBs from old builds)
    const versionResult = await db.execute('PRAGMA user_version;');
    const currentVersion = (versionResult.rows[0] as any)?.user_version ?? 0;
    console.log(
      `[DB] Current version: ${currentVersion}, expected: ${DB_VERSION}`,
    );

    if (currentVersion !== DB_VERSION) {
      console.log(
        '[DB] Version mismatch — dropping tables to clear corrupt data...',
      );
      await db.execute('DROP TABLE IF EXISTS face_embeddings;');
      await db.execute('DROP TABLE IF EXISTS attendance_records;');
      await db.execute('DROP TABLE IF EXISTS attendance_sessions;');
      await db.execute('DROP TABLE IF EXISTS enrollments;');
      await db.execute('DROP TABLE IF EXISTS students;');
      await db.execute('DROP TABLE IF EXISTS classes;');
      await db.execute('DROP TABLE IF EXISTS users;');
      await db.execute('DROP TABLE IF EXISTS schools;');
      await db.execute(`PRAGMA user_version = ${DB_VERSION};`);
      console.log('[DB] Tables dropped, will re-create and re-seed.');
    }

    // Users table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        name        TEXT NOT NULL,
        role        TEXT NOT NULL CHECK(role IN ('teacher', 'admin')),
        pin_hash    TEXT NOT NULL,
        created_at  TEXT NOT NULL
      );
    `);

    // Schools table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS schools (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        name        TEXT NOT NULL,
        created_at  TEXT NOT NULL
      );
    `);

    // Classes table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS classes (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        name        TEXT NOT NULL,
        grade       TEXT,
        school_id   INTEGER REFERENCES schools(id),
        teacher_id  INTEGER REFERENCES users(id),
        schedule    TEXT,
        created_at  TEXT NOT NULL
      );
    `);

    // Students table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS students (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        student_code  TEXT UNIQUE NOT NULL,
        first_name    TEXT NOT NULL,
        last_name     TEXT NOT NULL,
        date_of_birth TEXT,
        thumbnail     BLOB,
        active        INTEGER DEFAULT 1,
        created_at    TEXT NOT NULL
      );
    `);

    // Enrollments table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS enrollments (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id  INTEGER NOT NULL REFERENCES students(id),
        class_id    INTEGER NOT NULL REFERENCES classes(id),
        enrolled_at TEXT NOT NULL,
        UNIQUE(student_id, class_id)
      );
    `);

    // Face embeddings table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS face_embeddings (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id  INTEGER NOT NULL REFERENCES students(id),
        embedding   BLOB NOT NULL,
        quality     REAL,
        created_at  TEXT NOT NULL
      );
    `);

    // Attendance sessions table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS attendance_sessions (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        class_id     INTEGER NOT NULL REFERENCES classes(id),
        teacher_id   INTEGER NOT NULL REFERENCES users(id),
        date         TEXT NOT NULL,
        start_time   TEXT NOT NULL,
        end_time     TEXT,
        notes        TEXT,
        created_at   TEXT NOT NULL
      );
    `);

    // Attendance records table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS attendance_records (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id    INTEGER NOT NULL REFERENCES attendance_sessions(id),
        student_id    INTEGER NOT NULL REFERENCES students(id),
        status        TEXT NOT NULL CHECK(status IN ('present','absent','late','excused')),
        arrival_time  TEXT,
        method        TEXT DEFAULT 'face' CHECK(method IN ('face','manual')),
        confidence    REAL,
        note          TEXT,
        created_at    TEXT NOT NULL,
        UNIQUE(session_id, student_id)
      );
    `);

    // Create indexes
    await db.execute(
      'CREATE INDEX IF NOT EXISTS idx_attendance_session ON attendance_records(session_id);',
    );
    await db.execute(
      'CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance_records(student_id);',
    );
    await db.execute(
      'CREATE INDEX IF NOT EXISTS idx_session_class_date ON attendance_sessions(class_id, date);',
    );
    await db.execute(
      'CREATE INDEX IF NOT EXISTS idx_embedding_student ON face_embeddings(student_id);',
    );

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
};
