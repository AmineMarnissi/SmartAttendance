import {embeddingStorage} from '../../src/services/faceRecognition/EmbeddingStorage';
import {studentRepository} from '../../src/services/database/studentRepository';
import {classRepository} from '../../src/services/database/classRepository';
import {l2NormalizeEmbedding} from '../../src/services/faceRecognition/FaceEmbedder';
import {FaceMatcher} from '../../src/services/faceRecognition/FaceMatcher';

// We override the default mock for op-sqlite to have an in-memory test DB for this specific test
jest.mock('@op-engineering/op-sqlite', () => {
  const store: Record<string, any[]> = {
    students: [],
    classes: [],
    enrollments: [],
    face_embeddings: [],
  };
  let idCounter = 1;

  return {
    open: () => ({
      execute: jest.fn(async (query: string, params: any[] = []) => {
        if (query.includes('INSERT INTO students')) {
          const id = idCounter++;
          store.students.push({
            id,
            student_code: params[0],
            first_name: params[1],
            last_name: params[2],
            active: 1,
          });
          return {insertId: id, rows: {_array: []}};
        }
        if (query.includes('INSERT OR IGNORE INTO enrollments')) {
          store.enrollments.push({
            student_id: params[0],
            class_id: params[1],
          });
          return {rows: {_array: []}};
        }
        if (query.includes('INSERT INTO face_embeddings')) {
          store.face_embeddings.push({
            student_id: params[0],
            embedding: params[1], // Should be ArrayBuffer
            quality: params[2],
          });
          return {rows: {_array: []}};
        }
        if (query.includes('SELECT s.* FROM students s')) {
          // getForClass query
          const classId = params[0];
          const studentIds = store.enrollments
            .filter(e => e.class_id === classId)
            .map(e => e.student_id);
          const students = store.students.filter(s =>
            studentIds.includes(s.id),
          );
          return {rows: {_array: students}};
        }
        if (query.includes('SELECT fe.student_id, fe.embedding')) {
          // getAllForClass
          const classId = params[0];
          const studentIds = store.enrollments
            .filter(e => e.class_id === classId)
            .map(e => e.student_id);
          const embeddings = store.face_embeddings.filter(fe =>
            studentIds.includes(fe.student_id),
          );
          console.log(
            'Returning from mock DB:',
            embeddings[0].embedding.byteLength,
            embeddings[0].embedding instanceof ArrayBuffer,
          );
          return {rows: {_array: embeddings}};
        }
        return {rows: {_array: []}};
      }),
    }),
  };
});

describe('Face Recognition Flow Integration Test', () => {
  it('should successfully enroll a student face and match it during live attendance', async () => {
    // 1. Simulate Student Enrollment Data
    const mockClassId = 101;
    const studentData = {
      studentCode: 'STU001',
      firstName: 'John',
      lastName: 'Doe',
      classId: mockClassId,
    };

    // 2. Insert Student and Enroll in Class
    const studentId = await studentRepository.create({
      student_code: studentData.studentCode,
      first_name: studentData.firstName,
      last_name: studentData.lastName,
    });
    expect(studentId).toBeDefined();

    await classRepository.enrollStudent(studentId, studentData.classId);

    // 3. Simulate captured faces (embeddings from FaceEmbedder)
    // Create an artificial "face embedding" consisting of random floats
    const mockEmbeddingLength = 128;
    const capturedEmbedding = new Float32Array(mockEmbeddingLength);
    for (let i = 0; i < mockEmbeddingLength; i++) {
      capturedEmbedding[i] = Math.random();
    }
    const normalizedCaptured = l2NormalizeEmbedding(capturedEmbedding);

    // 4. Save the embedding using EmbeddingStorage (which we updated to pass ArrayBuffer)
    await embeddingStorage.save(studentId, normalizedCaptured, 0.95);

    // 5. Simulate Live Attendance (loading class data)
    const [enrolledEmbeddings, students] = await Promise.all([
      embeddingStorage.getAllForClass(mockClassId),
      studentRepository.getForClass(mockClassId),
    ]);

    expect(students.length).toBe(1);
    expect(students[0].first_name).toBe('John');
    expect(enrolledEmbeddings.length).toBe(1);
    expect(enrolledEmbeddings[0].studentId).toBe(studentId);

    // 6. Simulate a Live Capture frame containing the EXACT same face vector
    // Add small noise to represent live capture variation
    const liveCaptureEmbedding = new Float32Array(mockEmbeddingLength);
    for (let i = 0; i < mockEmbeddingLength; i++) {
      liveCaptureEmbedding[i] = normalizedCaptured[i] + Math.random() * 0.01;
    }
    const liveNormalized = l2NormalizeEmbedding(liveCaptureEmbedding);

    // 7. Match the Live Capture using FaceMatcher
    console.log('Enrolled embeddings length:', enrolledEmbeddings.length);
    if (enrolledEmbeddings.length > 0) {
      console.log(
        'Enrolled embedding 0 length:',
        enrolledEmbeddings[0].embedding.length,
      );
    }
    const match = FaceMatcher.match(liveNormalized, enrolledEmbeddings);

    // Assert that the match is successful and returns the correct studentId
    expect(match).not.toBeNull();
    expect(match?.studentId).toBe(studentId);
    expect(match?.confidence).toBeGreaterThan(0.85); // Matches our threshold
  });
});
