import RNFS from 'react-native-fs';
import {Share} from 'react-native';

const ATTENDANCE_EXPORT_COLUMNS = [
  'date',
  'student_id',
  'status',
  'arrival_time',
  'method',
];

const escapeCsvValue = (value: unknown): string => {
  if (value == null) {
    return '';
  }

  const text = String(value);
  const escaped = text.replace(/"/g, '""');
  return /[",\r\n]/.test(escaped) ? `"${escaped}"` : escaped;
};

export const CSVExportService = {
  exportAttendance: async (data: any[], fileName: string): Promise<void> => {
    const columns =
      data.length > 0 ? Object.keys(data[0]) : ATTENDANCE_EXPORT_COLUMNS;
    const headers = columns.join(',');
    const rows = data
      .map(obj => columns.map(column => escapeCsvValue(obj[column])).join(','))
      .join('\n');
    const csvContent = `${headers}\n${rows}`;

    const path = `${RNFS.DocumentDirectoryPath}/${fileName}.csv`;

    try {
      await RNFS.writeFile(path, csvContent, 'utf8');
      await Share.share({
        url: `file://${path}`,
        title: 'Export Attendance CSV',
      });
    } catch (error) {
      console.error('Failed to export CSV:', error);
      throw error;
    }
  },
};
