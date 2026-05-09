import {userRepository} from './userRepository';
import {classRepository} from './classRepository';
import {studentRepository} from './studentRepository';
import {embeddingStorage} from '../faceRecognition/EmbeddingStorage';
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
      name: 'John Doe',
      role: 'teacher',
      pin_hash: teacherPin,
    });

    // Create Class
    const classId = await classRepository.create({
      name: 'Math 10-A',
      grade: '10',
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

    // Enroll Students
    await classRepository.enrollStudent(student1Id, classId);
    await classRepository.enrollStudent(student2Id, classId);

    // Create Dummy Embeddings for testing
    const dummyAlice = new Float32Array(128).fill(0.1);
    const dummyBob = new Float32Array(128).fill(0.2);
    await embeddingStorage.save(student1Id, dummyAlice);
    await embeddingStorage.save(student2Id, dummyBob);

    console.log('Seeding completed successfully');
  } catch (error) {
    console.error('Seeding failed:', error);
  }
};
