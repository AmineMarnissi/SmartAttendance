import {attendanceRepository} from '../database/attendanceRepository';
import {classRepository} from '../database/classRepository';
import {studentRepository} from '../database/studentRepository';
import {AttendanceRecord, AttendanceSession} from '../../types/models';
import {isAfter, parse} from 'date-fns';

import {LocalNotificationService} from '../notification/LocalNotificationService';

export const AttendanceService = {
  startSession: async (classId: number, teacherId: number): Promise<number> => {
    const now = new Date();
    const session: Omit<AttendanceSession, 'id' | 'created_at'> = {
      class_id: classId,
      teacher_id: teacherId,
      date: now.toISOString().split('T')[0],
      start_time: now.toISOString(),
      notes: '',
    };
    return await attendanceRepository.createSession(session);
  },

  processResults: async (
    sessionId: number,
    classId: number,
    detectedResults: {studentId: number; confidence: number}[],
  ): Promise<void> => {
    const cls = await classRepository.getById(classId);
    const students = await studentRepository.getForClass(classId);

    const now = new Date();
    const arrivalTime = now.toISOString();

    let isLate = false;
    if (cls?.schedule) {
      try {
        const schedule = JSON.parse(cls.schedule);
        const today = now.toLocaleDateString('en-US', {weekday: 'long'});
        const todaySched = schedule.find((s: any) => s.day === today);
        if (todaySched) {
          const startTime = parse(todaySched.start_time, 'HH:mm', now);
          const graceLimit = new Date(startTime.getTime() + 5 * 60000);
          isLate = isAfter(now, graceLimit);
        }
      } catch (e) {
        console.error('Schedule parsing failed', e);
      }
    }

    for (const student of students) {
      const match = detectedResults.find(r => r.studentId === student.id);
      const isPresent = !!match;
      const record: Omit<AttendanceRecord, 'id' | 'created_at'> = {
        session_id: sessionId,
        student_id: student.id,
        status: isPresent ? (isLate ? 'late' : 'present') : 'absent',
        arrival_time: isPresent ? arrivalTime : undefined,
        method: 'face',
        confidence: match?.confidence || 0,
      };
      await attendanceRepository.saveRecord(record);

      // Absence tracking & notifications
      if (!isPresent) {
        const streak = await attendanceRepository.getRecentAbsencesCount(
          student.id,
        );
        if (streak >= 3) {
          await LocalNotificationService.sendAbsenceAlert(
            `${student.first_name} ${student.last_name}`,
            streak,
          );
        }
      }
    }
  },

  finalizeSession: async (
    sessionId: number,
    _notes?: string,
  ): Promise<void> => {
    // Logic to close session or update notes
    const session = await attendanceRepository.getSessionById(sessionId);
    if (session) {
      // In a real app, we might update end_time here
      // attendanceRepository.updateSession(sessionId, { notes, end_time: new Date().toISOString() });
    }
  },
};
