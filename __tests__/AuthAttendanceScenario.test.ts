import {AuthService} from '../src/services/auth/AuthService';
import {AttendanceService} from '../src/services/attendance/AttendanceService';
import {classRepository} from '../src/services/database/classRepository';
import {studentRepository} from '../src/services/database/studentRepository';
import {attendanceRepository} from '../src/services/database/attendanceRepository';
import {userRepository} from '../src/services/database/userRepository';
import {useAuthStore} from '../src/store/useAuthStore';

jest.mock('../src/services/database/userRepository');
jest.mock('../src/services/database/classRepository');
jest.mock('../src/services/database/studentRepository');
jest.mock('../src/services/database/attendanceRepository');
jest.mock('../src/services/notification/LocalNotificationService', () => ({
  LocalNotificationService: {
    initialize: jest.fn(),
    sendAbsenceAlert: jest.fn(),
  },
}));

describe('RegistreIntelligent first-run scenario', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.getState().logout();
  });

  it('creates a teacher user and logs in with the created PIN', async () => {
    const createdTeacher = {
      id: 10,
      name: 'Teacher One',
      role: 'teacher' as const,
      pin_hash: '',
      created_at: '2026-05-10T00:00:00.000Z',
    };

    (userRepository.getByName as jest.Mock).mockResolvedValueOnce(null);
    (userRepository.create as jest.Mock).mockResolvedValue(10);
    (userRepository.getById as jest.Mock).mockImplementation(async () => ({
      ...createdTeacher,
      pin_hash: (userRepository.create as jest.Mock).mock.calls[0][0].pin_hash,
    }));

    const user = await AuthService.setupPin('Teacher One', 'teacher', '2468');

    expect(userRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({name: 'Teacher One', role: 'teacher'}),
    );
    expect(user.pin_hash).toEqual(expect.any(String));

    (userRepository.getByName as jest.Mock).mockResolvedValue(user);

    await expect(AuthService.login('Teacher One', '2468')).resolves.toBe(true);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().user?.name).toBe('Teacher One');
  });

  it('saves present and absent records for a class attendance scan', async () => {
    (classRepository.getById as jest.Mock).mockResolvedValue({
      id: 5,
      name: '3-Eco 4',
      created_at: '2026-05-10T00:00:00.000Z',
    });
    (studentRepository.getForClass as jest.Mock).mockResolvedValue([
      {id: 1, first_name: 'Alice', last_name: 'Smith'},
      {id: 2, first_name: 'Bob', last_name: 'Jones'},
    ]);
    (
      attendanceRepository.getRecentAbsencesCount as jest.Mock
    ).mockResolvedValue(1);

    await AttendanceService.processResults(99, 5, [
      {studentId: 1, confidence: 0.93},
    ]);

    expect(attendanceRepository.saveRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        session_id: 99,
        student_id: 1,
        status: 'present',
        confidence: 0.93,
      }),
    );
    expect(attendanceRepository.saveRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        session_id: 99,
        student_id: 2,
        status: 'absent',
      }),
    );
  });
});
