import {attendanceRepository} from '../src/services/database/attendanceRepository';
import {db} from '../src/services/database/db';

describe('attendance repository summaries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calculates class attendance rate from persisted session records', async () => {
    jest.spyOn(db, 'execute').mockResolvedValueOnce({
      rows: [{session_count: '1', present_count: '2', total_count: '2'}],
    } as any);

    await expect(
      attendanceRepository.getClassAttendanceSummary(7),
    ).resolves.toEqual({
      sessionCount: 1,
      presentCount: 2,
      recordedCount: 2,
      rate: 100,
    });
  });

  it('returns zero rate without NaN when a class has sessions but no records', async () => {
    jest.spyOn(db, 'execute').mockResolvedValueOnce({
      rows: [{session_count: 1, present_count: null, total_count: 0}],
    } as any);

    await expect(
      attendanceRepository.getClassAttendanceSummary(7),
    ).resolves.toEqual({
      sessionCount: 1,
      presentCount: 0,
      recordedCount: 0,
      rate: 0,
    });
  });
});
