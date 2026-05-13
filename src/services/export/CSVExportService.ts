import RNFS from 'react-native-fs';
import {Share} from 'react-native';
import {generatePDF} from 'react-native-html-to-pdf';

const escapeCsvValue = (value: unknown): string => {
  if (value == null) {
    return '';
  }

  const text = String(value);
  const escaped = text.replace(/"/g, '""');
  return /[",\r\n]/.test(escaped) ? `"${escaped}"` : escaped;
};

const escapeHtmlValue = (value: unknown): string => {
  if (value == null) {
    return '';
  }

  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};

export const CSVExportService = {
  exportAttendance: async (data: any[], fileName: string): Promise<void> => {
    const columns = data.length > 0 ? Object.keys(data[0]) : [];
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

  exportAttendanceExcel: async (
    data: Record<string, unknown>[],
    fileName: string,
  ): Promise<void> => {
    const columns = data.length > 0 ? Object.keys(data[0]) : [];
    const headerCells = columns
      .map(column => `<th>${escapeHtmlValue(column)}</th>`)
      .join('');
    const rows = data
      .map(
        row =>
          `<tr>${columns
            .map(column => `<td>${escapeHtmlValue(row[column])}</td>`)
            .join('')}</tr>`,
      )
      .join('');
    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    table { border-collapse: collapse; font-family: Arial, sans-serif; }
    th { background: #1f4e79; color: #fff; font-weight: bold; }
    th, td { border: 1px solid #9e9e9e; padding: 6px 8px; }
  </style>
</head>
<body>
  <table>
    <thead><tr>${headerCells}</tr></thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;
    const path = `${RNFS.DocumentDirectoryPath}/${fileName}.xls`;

    try {
      await RNFS.writeFile(path, html, 'utf8');
      await Share.share({
        url: `file://${path}`,
        title: 'Export Attendance Excel',
      });
    } catch (error) {
      console.error('Failed to export Excel:', error);
      throw error;
    }
  },

  exportAttendancePdf: async (
    data: Record<string, unknown>[],
    fileName: string,
    title: string,
    metadata: Record<string, unknown> = {},
  ): Promise<string> => {
    const columns = data.length > 0 ? Object.keys(data[0]) : [];
    const metadataRows = Object.entries(metadata)
      .map(
        ([label, value]) =>
          `<div class="meta-row"><strong>${escapeHtmlValue(
            label,
          )}:</strong> ${escapeHtmlValue(value)}</div>`,
      )
      .join('');
    const headerCells = columns
      .map(column => `<th>${escapeHtmlValue(column)}</th>`)
      .join('');
    const rows = data
      .map(
        row =>
          `<tr>${columns
            .map(column => `<td>${escapeHtmlValue(row[column])}</td>`)
            .join('')}</tr>`,
      )
      .join('');
    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @page { margin: 18px; }
    body { font-family: Arial, sans-serif; color: #1f2933; }
    h1 { font-size: 22px; margin: 0 0 12px; color: #102a43; }
    .meta { margin-bottom: 16px; font-size: 11px; }
    .meta-row { margin: 3px 0; }
    table { border-collapse: collapse; width: 100%; font-size: 9px; }
    th { background: #1f4e79; color: #fff; font-weight: bold; }
    th, td { border: 1px solid #9e9e9e; padding: 5px 6px; text-align: left; }
    tr:nth-child(even) td { background: #f4f7fb; }
  </style>
</head>
<body>
  <h1>${escapeHtmlValue(title)}</h1>
  <div class="meta">${metadataRows}</div>
  <table>
    <thead><tr>${headerCells}</tr></thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;

    try {
      const result = await generatePDF({
        html,
        fileName,
        directory: 'Reports',
        width: 842,
        height: 595,
        shouldPrintBackgrounds: true,
      });
      const sourcePath = result.filePath.replace(/^file:\/\//, '');
      const downloadPath = `${RNFS.DownloadDirectoryPath}/${fileName}.pdf`;

      if (await RNFS.exists(downloadPath)) {
        await RNFS.unlink(downloadPath);
      }

      await RNFS.copyFile(sourcePath, downloadPath);
      await RNFS.scanFile(downloadPath).catch(() => undefined);
      return downloadPath;
    } catch (error) {
      console.error('Failed to export PDF:', error);
      throw error;
    }
  },
};
