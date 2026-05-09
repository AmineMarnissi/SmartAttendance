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
      'SELECT * FROM attendance_sessions WHERE class_id = ? ORDER BY date DESC;',
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
      'SELECT * FROM attendance_records WHERE session_id = ?;',
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
      ORDER BY asess.date DESC;
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

  getDailyAttendanceTrend: async (
    classId: number,
    days: number = 7,
  ): Promise<AttendanceTrendRow[]> => {
    const result = await db.execute(
      `
      SELECT 
        asess.date,
        COUNT(CASE WHEN ar.status IN ('present', 'late') THEN 1 END) * 100.0 / COUNT(*) as rate
      FROM attendance_sessions asess
      JOIN attendance_records ar ON asess.id = ar.session_id
      WHERE asess.class_id = ?
      GROUP BY asess.date
      ORDER BY asess.date DESC
      LIMIT ?;
    `,
      [classId, days],
    );
    return getRows<AttendanceTrendRow>(result).reverse();
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
