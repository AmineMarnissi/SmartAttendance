import RNFS from 'react-native-fs';
import {Share} from 'react-native';
import {CSVExportService} from '../src/services/export/CSVExportService';

describe('CSVExportService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Share, 'share').mockResolvedValue({action: 'sharedAction'});
  });

  it('exports an empty attendance report with headers', async () => {
    await expect(
      CSVExportService.exportAttendance([], 'Empty_Report'),
    ).resolves.toBeUndefined();

    expect(RNFS.writeFile).toHaveBeenCalledWith(
      '/mock-path/Empty_Report.csv',
      'date,student_id,status,arrival_time,method\n',
      'utf8',
    );
    expect(Share.share).toHaveBeenCalledWith({
      url: 'file:///mock-path/Empty_Report.csv',
      title: 'Export Attendance CSV',
    });
  });

  it('escapes commas, quotes, and line breaks in CSV values', async () => {
    await CSVExportService.exportAttendance(
      [
        {
          date: '2026-05-10',
          student_id: 'STU,001',
          status: 'present',
          arrival_time: '08:10 "AM"',
          method: 'face\nscan',
        },
      ],
      'Escaped_Report',
    );

    expect(RNFS.writeFile).toHaveBeenCalledWith(
      '/mock-path/Escaped_Report.csv',
      'date,student_id,status,arrival_time,method\n2026-05-10,"STU,001",present,"08:10 ""AM""","face\nscan"',
      'utf8',
    );
  });
});
