import bcrypt from 'bcryptjs';
import {classRepository} from '../database/classRepository';
import {userRepository} from '../database/userRepository';
import {useAuthStore} from '../../store/useAuthStore';
import {User} from '../../types/models';

const DEFAULT_TEACHER_NAME = 'John Doe';
const DEFAULT_TEACHER_PIN = '0000';
const DEFAULT_CLASS_NAME = 'Math 10-A';

const createDefaultTeacher = async (): Promise<User> => {
  const salt = await bcrypt.genSalt(10);
  const pinHash = await bcrypt.hash(DEFAULT_TEACHER_PIN, salt);
  const teacherId = await userRepository.create({
    name: DEFAULT_TEACHER_NAME,
    role: 'teacher',
    pin_hash: pinHash,
  });
  const teacher = await userRepository.getById(teacherId);

  if (!teacher) {
    throw new Error('Default teacher was created but could not be loaded.');
  }

  return teacher;
};

const getOrCreateDefaultTeacher = async (): Promise<User> => {
  const namedTeacher = await userRepository.getByName(DEFAULT_TEACHER_NAME);
  if (namedTeacher?.role === 'teacher') {
    return namedTeacher;
  }

  const teachers = await userRepository.getByRole('teacher');
  if (teachers.length > 0) {
    return teachers[0];
  }

  return createDefaultTeacher();
};

const ensureTeacherHasClass = async (teacherId: number): Promise<void> => {
  const teacherClasses = await classRepository.getByTeacher(teacherId);
  if (teacherClasses.length > 0) {
    return;
  }

  await classRepository.create({
    name: DEFAULT_CLASS_NAME,
    grade: '10',
    teacher_id: teacherId,
    schedule: JSON.stringify([
      {day: 'Monday', start_time: '08:00', end_time: '09:30'},
    ]),
  });
};

export const bootstrapDefaultSession = async (): Promise<User> => {
  const teacher = await getOrCreateDefaultTeacher();
  await ensureTeacherHasClass(teacher.id);

  useAuthStore.getState().setUser(teacher);
  useAuthStore.getState().setAuthenticated(true);

  return teacher;
};
