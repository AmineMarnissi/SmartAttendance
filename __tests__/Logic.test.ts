import {cosineSimilarity} from '../src/utils/cosineSimilarity';
import {FaceMatcher} from '../src/services/faceRecognition/FaceMatcher';
import {AttendanceService} from '../src/services/attendance/AttendanceService';
import {attendanceRepository} from '../src/services/database/attendanceRepository';
import {studentRepository} from '../src/services/database/studentRepository';
import {classRepository} from '../src/services/database/classRepository';

// Mock repositories to avoid actual DB calls during logic tests
jest.mock('../src/services/database/attendanceRepository');
jest.mock('../src/services/database/studentRepository');
jest.mock('../src/services/database/classRepository');

describe('RegistreIntelligent Core Logic', () => {
  describe('AI: Cosine Similarity', () => {
    it('should return 1.0 for identical vectors', () => {
      const vec = new Float32Array([1, 0, 0, 1]);
      expect(cosineSimilarity(vec, vec)).toBeCloseTo(1.0);
    });

    it('should return 0 for orthogonal vectors', () => {
      const v1 = new Float32Array([1, 0]);
      const v2 = new Float32Array([0, 1]);
      expect(cosineSimilarity(v1, v2)).toBe(0);
    });
  });

  describe('Face Matching', () => {
    it('should match a student if similarity is above threshold (0.75)', () => {
      const live = new Float32Array([1, 0, 0]);
      const enrolled = [
        {studentId: 1, embedding: new Float32Array([0.9, 0.1, 0])},
      ];

      const result = FaceMatcher.match(live, enrolled);
      expect(result).not.toBeNull();
      expect(result?.studentId).toBe(1);
    });

    it('should return null if no similarity is above threshold', () => {
      const live = new Float32Array([1, 0, 0]);
      const enrolled = [{studentId: 1, embedding: new Float32Array([0, 1, 0])}];

      const result = FaceMatcher.match(live, enrolled);
      expect(result).toBeNull();
    });
  });

  describe('Attendance Service', () => {
    it('should correctly process scan results and save records', async () => {
      const sessionId = 1;
      const classId = 10;
      const detectedResults = [{studentId: 1, confidence: 0.9}];

      const mockStudents = [
        {id: 1, first_name: 'Alice', last_name: 'Smith'},
        {id: 2, first_name: 'Bob', last_name: 'Jones'},
      ];

      (studentRepository.getForClass as jest.Mock).mockResolvedValue(
        mockStudents,
      );
      (classRepository.getById as jest.Mock).mockResolvedValue({
        id: 10,
        name: 'Math',
      });

      await AttendanceService.processResults(
        sessionId,
        classId,
        detectedResults,
      );

      // Verify that saveRecord was called for BOTH students (1 present, 1 absent)
      expect(attendanceRepository.saveRecord).toHaveBeenCalledTimes(2);

      // Alice (present)
      expect(attendanceRepository.saveRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          student_id: 1,
          status: 'present',
        }),
      );

      // Bob (absent)
      expect(attendanceRepository.saveRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          student_id: 2,
          status: 'absent',
        }),
      );
    });
  });
});
