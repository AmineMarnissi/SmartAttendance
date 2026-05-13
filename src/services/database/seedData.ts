import {userRepository} from './userRepository';
import {classRepository} from './classRepository';
import {studentRepository} from './studentRepository';
import bcrypt from 'bcryptjs';
import {User} from '../../types/models';

const DEFAULT_ADMIN = {
  name: 'Admin User',
  role: 'admin' as const,
  pin: '1234',
};

const DEFAULT_TEACHER = {
  name: 'John Doe',
  role: 'teacher' as const,
  pin: '5678',
};

const DEFAULT_CLASS = {
  name: 'Math 10-A',
  grade: '10',
  schedule: JSON.stringify([
    {day: 'Monday', start_time: '08:00', end_time: '09:30'},
  ]),
};

const DEFAULT_STUDENTS = [
  {student_code: 'S001', first_name: 'Alice', last_name: 'Smith'},
  {student_code: 'S002', first_name: 'Bob', last_name: 'Johnson'},
];

const hashPin = async (pin: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(pin, salt);
};

const ensureDefaultUser = async (defaultUser: {
  name: string;
  role: User['role'];
  pin: string;
}): Promise<User> => {
  const pinHash = await hashPin(defaultUser.pin);
  const existing = await userRepository.getByName(defaultUser.name);

  if (existing && existing.role === defaultUser.role) {
    await userRepository.updatePin(existing.id, pinHash);
    return {...existing, pin_hash: pinHash};
  }

  const userId = await userRepository.create({
    name: defaultUser.name,
    role: defaultUser.role,
    pin_hash: pinHash,
  });
  const createdUser = await userRepository.getById(userId);

  if (!createdUser) {
    throw new Error(`${defaultUser.name} was created but could not be loaded.`);
  }

  return createdUser;
};

const ensureDefaultClass = async (teacherId: number): Promise<number> => {
  const classes = await classRepository.getByTeacher(teacherId);
  if (classes.length > 0) {
    return classes[0].id;
  }

  return classRepository.create({
    ...DEFAULT_CLASS,
    teacher_id: teacherId,
  });
};

const ensureDefaultStudents = async (classId: number): Promise<void> => {
  for (const student of DEFAULT_STUDENTS) {
    const existing = await studentRepository.getByCode(student.student_code);
    const studentId =
      existing?.id ??
      (await studentRepository.create({
        ...student,
      }));

    await classRepository.enrollStudent(studentId, classId);
  }
};

export const seedData = async () => {
  try {
    console.log('Seeding default login accounts and class data...');

    await ensureDefaultUser(DEFAULT_ADMIN);
    const teacher = await ensureDefaultUser(DEFAULT_TEACHER);
    const classId = await ensureDefaultClass(teacher.id);
    await ensureDefaultStudents(classId);

    console.log('Seeding completed successfully');
  } catch (error) {
    console.error('Seeding failed:', error);
  }
};
