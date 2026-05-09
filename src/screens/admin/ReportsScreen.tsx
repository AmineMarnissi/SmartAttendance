import React, {useState, useEffect} from 'react';
import {StyleSheet, ScrollView, Alert, Text} from 'react-native';
import {List, Button, Card} from 'react-native-paper';
import {classRepository} from '../../services/database/classRepository';
import {attendanceRepository} from '../../services/database/attendanceRepository';
import {CSVExportService} from '../../services/export/CSVExportService';
import {Class} from '../../types/models';

const ReportsScreen = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    const all = await classRepository.getAll();
    setClasses(all);
  };

  const exportClassReport = async (classId: number, className: string) => {
    setLoading(true);
    try {
      // Fetch all attendance records for this class
      const sessions = await attendanceRepository.getSessionsByClass(classId);
      let reportData: any[] = [];

      for (const session of sessions) {
        const records = await attendanceRepository.getRecordsBySession(
          session.id,
        );
        const recordsWithContext = records.map(r => ({
          date: session.date,
          student_id: r.student_id,
          status: r.status,
          arrival_time: r.arrival_time || 'N/A',
          method: r.method,
        }));
        reportData = [...reportData, ...recordsWithContext];
      }

      await CSVExportService.exportAttendance(
        reportData,
        `Attendance_Report_${className.replace(/\s/g, '_')}_${
          new Date().toISOString().split('T')[0]
        }`,
      );
    } catch (error) {
      Alert.alert(
        'Export Failed',
        'An error occurred while generating the report.',
      );
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Export Reports</Text>
      <Card style={styles.card}>
        <Card.Content>
          <Text>Generate and share attendance reports in CSV format.</Text>
        </Card.Content>
      </Card>

      <List.Section>
        <Text style={styles.sectionTitle}>Select Class for Report</Text>
        {classes.map(cls => (
          <List.Item
            key={cls.id}
            title={cls.name}
            description={`Grade: ${cls.grade || 'N/A'}`}
            left={props => <List.Icon {...props} icon="file-export" />}
            right={() => (
              <Button
                mode="outlined"
                onPress={() => exportClassReport(cls.id, cls.name)}
                loading={loading}
                disabled={loading}>
                Export
              </Button>
            )}
          />
        ))}
      </List.Section>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  title: {
    padding: 20,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
  },
  card: {
    margin: 10,
    backgroundColor: '#f9f9f9',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
});

export default ReportsScreen;
