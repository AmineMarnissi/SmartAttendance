import {userRepository} from './userRepository';
import {classRepository} from './classRepository';
import {studentRepository} from './studentRepository';
import bcrypt from 'bcryptjs';

export const seedData = async () => {
  try {
    const users = await userRepository.getAll();
    if (users.length > 0) {
      return;
    } // Already seeded

    console.log('Seeding initial data...');

    // Create Admin
    const salt = await bcrypt.genSalt(10);
    const adminPin = await bcrypt.hash('1234', salt);
    await userRepository.create({
      name: 'Admin User',
      role: 'admin',
      pin_hash: adminPin,
    });

    // Create Teacher
    const teacherPin = await bcrypt.hash('5678', salt);
    const teacherId = await userRepository.create({
      name: 'Habiba Haj Sassi',
      role: 'teacher',
      pin_hash: teacherPin,
    });

    // Create Class
    const classId = await classRepository.create({
      name: '3-Eco 4',
      grade: '3-Eco',
      teacher_id: teacherId,
      schedule: JSON.stringify([
        {day: 'Monday', start_time: '08:00', end_time: '09:30'},
      ]),
    });

    // Create Students
    const student1Id = await studentRepository.create({
      student_code: 'S001',
      first_name: 'Alice',
      last_name: 'Smith',
    });

    const student2Id = await studentRepository.create({
      student_code: 'S002',
      first_name: 'Bob',
      last_name: 'Johnson',
    });

    // Enroll Students (no face embeddings in seed - they must be enrolled via FaceCaptureScreen)
    await classRepository.enrollStudent(student1Id, classId);
    await classRepository.enrollStudent(student2Id, classId);

    console.log('Seeding completed successfully');
  } catch (error) {
    console.error('Seeding failed:', error);
  }
};
