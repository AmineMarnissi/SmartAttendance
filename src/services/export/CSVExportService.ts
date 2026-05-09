import RNFS from 'react-native-fs';
import {Share} from 'react-native';

export const CSVExportService = {
  exportAttendance: async (data: any[], fileName: string): Promise<void> => {
    if (data.length === 0) {
      throw new Error('No data to export');
    }

    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(obj => Object.values(obj).join(',')).join('\n');
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
