import {db, getFirstRow, getRows} from './db';
import {AttendanceSession, AttendanceRecord} from '../../types/models';

type AttendanceHistoryRow = AttendanceRecord & {
  date: string;
  class_id: number;
  class_name: string;
};

type AttendanceStatRow = {
  status: AttendanceRecord['status'];
  count: number;
};

type AttendanceTrendRow = {
  date: string;
  rate: number;
};

export type ClassAttendanceSummary = {
  sessionCount: number;
  presentCount: number;
  recordedCount: number;
  rate: number;
};

const toNumber = (value: unknown): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
};

const calculateAttendanceRate = (presentCount: number, totalCount: number) =>
  totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

export const attendanceRepository = {
  createSession: async (
    session: Omit<AttendanceSession, 'id' | 'created_at'>,
  ): Promise<number> => {
    const createdAt = new Date().toISOString();
    const result = await db.execute(
      'INSERT INTO attendance_sessions (class_id, teacher_id, date, start_time, notes, created_at) VALUES (?, ?, ?, ?, ?, ?);',
      [
        session.class_id,
        session.teacher_id,
        session.date,
        session.start_time,
        session.notes,
        createdAt,
      ],
    );
    return result.insertId!;
  },

  getSessionById: async (id: number): Promise<AttendanceSession | null> => {
    const result = await db.execute(
      'SELECT * FROM attendance_sessions WHERE id = ?;',
      [id],
    );
    return getFirstRow<AttendanceSession>(result);
  },

  getSessionsByClass: async (classId: number): Promise<AttendanceSession[]> => {
    const result = await db.execute(
      'SELECT * FROM attendance_sessions WHERE class_id = ? ORDER BY date DESC, start_time DESC, id DESC;',
      [classId],
    );
    return getRows<AttendanceSession>(result);
  },

  saveRecord: async (
    record: Omit<AttendanceRecord, 'id' | 'created_at'>,
  ): Promise<void> => {
    const createdAt = new Date().toISOString();
    await db.execute(
      `
      INSERT INTO attendance_records (session_id, student_id, status, arrival_time, method, confidence, note, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(session_id, student_id) DO UPDATE SET
        status = excluded.status,
        arrival_time = excluded.arrival_time,
        method = excluded.method,
        confidence = excluded.confidence,
        note = excluded.note;
    `,
      [
        record.session_id,
        record.student_id,
        record.status,
        record.arrival_time,
        record.method,
        record.confidence,
        record.note,
        createdAt,
      ],
    );
  },

  getRecordsBySession: async (
    sessionId: number,
  ): Promise<AttendanceRecord[]> => {
    const result = await db.execute(
      'SELECT * FROM attendance_records WHERE session_id = ? ORDER BY student_id ASC;',
      [sessionId],
    );
    return getRows<AttendanceRecord>(result);
  },

  getStudentAttendanceHistory: async (
    studentId: number,
  ): Promise<AttendanceHistoryRow[]> => {
    const result = await db.execute(
      `
      SELECT ar.*, asess.date, asess.class_id, c.name as class_name
      FROM attendance_records ar
      JOIN attendance_sessions asess ON ar.session_id = asess.id
      JOIN classes c ON asess.class_id = c.id
      WHERE ar.student_id = ?
      ORDER BY asess.date DESC, asess.start_time DESC;
    `,
      [studentId],
    );
    return getRows<AttendanceHistoryRow>(result);
  },

  getRecentAbsencesCount: async (studentId: number): Promise<number> => {
    const result = await db.execute(
      `
      SELECT status FROM attendance_records
      WHERE student_id = ?
      ORDER BY created_at DESC
      LIMIT 10;
    `,
      [studentId],
    );

    const records = getRows<{status: AttendanceRecord['status']}>(result);
    let streak = 0;
    for (const record of records) {
      if (record.status === 'absent') {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  },

  getClassAttendanceStats: async (
    classId: number,
  ): Promise<AttendanceStatRow[]> => {
    const result = await db.execute(
      `
      SELECT 
        status, 
        COUNT(*) as count 
      FROM attendance_records ar
      JOIN attendance_sessions asess ON ar.session_id = asess.id
      WHERE asess.class_id = ?
      GROUP BY status;
    `,
      [classId],
    );
    return getRows<AttendanceStatRow>(result);
  },

  getClassAttendanceSummary: async (
    classId: number,
  ): Promise<ClassAttendanceSummary> => {
    const result = await db.execute(
      `
      SELECT
        COUNT(DISTINCT asess.id) as session_count,
        COUNT(CASE WHEN ar.status IN ('present', 'late') THEN 1 END) as present_count,
        COUNT(ar.id) as total_count
      FROM attendance_sessions asess
      LEFT JOIN attendance_records ar ON ar.session_id = asess.id
      WHERE asess.class_id = ?;
    `,
      [classId],
    );
    const row = getFirstRow<{
      session_count: unknown;
      present_count: unknown;
      total_count: unknown;
    }>(result);
    const sessionCount = toNumber(row?.session_count);
    const presentCount = toNumber(row?.present_count);
    const recordedCount = toNumber(row?.total_count);

    return {
      sessionCount,
      presentCount,
      recordedCount,
      rate: calculateAttendanceRate(presentCount, recordedCount),
    };
  },

  getClassAttendanceRate: async (classId: number): Promise<number> => {
    const summary = await attendanceRepository.getClassAttendanceSummary(
      classId,
    );
    return summary.rate;
  },

  getDailyAttendanceTrend: async (
    classId: number,
    days: number = 7,
  ): Promise<AttendanceTrendRow[]> => {
    const result = await db.execute(
      `
      SELECT 
        asess.date,
        COALESCE(
          COUNT(CASE WHEN ar.status IN ('present', 'late') THEN 1 END) * 100.0 / NULLIF(COUNT(ar.id), 0),
          0
        ) as rate
      FROM attendance_sessions asess
      LEFT JOIN attendance_records ar ON asess.id = ar.session_id
      WHERE asess.class_id = ?
      GROUP BY asess.date
      ORDER BY asess.date DESC
      LIMIT ?;
    `,
      [classId, days],
    );
    return getRows<AttendanceTrendRow>(result)
      .map(row => ({...row, rate: toNumber(row.rate)}))
      .reverse();
  },

  getSchoolWideStats: async (): Promise<AttendanceStatRow[]> => {
    const result = await db.execute(`
      SELECT 
        status, 
        COUNT(*) as count 
      FROM attendance_records
      GROUP BY status;
    `);
    return getRows<AttendanceStatRow>(result);
  },
};
