import React, {useCallback, useEffect, useState} from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {Card, Chip, DataTable, useTheme} from 'react-native-paper';
import {attendanceRepository} from '../../services/database/attendanceRepository';
import {classRepository} from '../../services/database/classRepository';
import {studentRepository} from '../../services/database/studentRepository';
import {
  AttendanceRecord,
  AttendanceSession,
  Class,
  Student,
} from '../../types/models';
import {usePreferencesStore} from '../../store/usePreferencesStore';
import {brand, shadow} from '../../theme/design';

type RecordMap = Record<number, Record<number, AttendanceRecord['status']>>;
type MatrixSummary = {
  sessionCount: number;
  presentCount: number;
  recordedCount: number;
  rate: number;
};

const emptySummary: MatrixSummary = {
  sessionCount: 0,
  presentCount: 0,
  recordedCount: 0,
  rate: 0,
};

const ClassAttendanceMatrixScreen = () => {
  const theme = useTheme();
  const t = usePreferencesStore(state => state.t);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [records, setRecords] = useState<RecordMap>({});
  const [summary, setSummary] = useState<MatrixSummary>(emptySummary);

  const loadClasses = useCallback(async () => {
    const loadedClasses = await classRepository.getAll();
    setClasses(loadedClasses);
    const selectedClassStillExists = loadedClasses.some(
      cls => cls.id === selectedClassId,
    );
    if ((!selectedClassId || !selectedClassStillExists) && loadedClasses[0]) {
      setSelectedClassId(loadedClasses[0].id);
    }
  }, [selectedClassId]);

  const loadMatrix = useCallback(async () => {
    if (!selectedClassId) {
      setStudents([]);
      setSessions([]);
      setRecords({});
      setSummary(emptySummary);
      return;
    }
    const [loadedStudents, loadedSessions, loadedSummary] = await Promise.all([
      studentRepository.getForClass(selectedClassId),
      attendanceRepository.getSessionsByClass(selectedClassId),
      attendanceRepository.getClassAttendanceSummary(selectedClassId),
    ]);
    const recentSessions = loadedSessions.slice(0, 8);
    const sessionRecords = await Promise.all(
      recentSessions.map(async session => ({
        session,
        records: await attendanceRepository.getRecordsBySession(session.id),
      })),
    );
    const nextRecords: RecordMap = {};
    sessionRecords.forEach(item => {
      nextRecords[item.session.id] = item.records.reduce<
        Record<number, AttendanceRecord['status']>
      >((acc, record) => {
        acc[record.student_id] = record.status;
        return acc;
      }, {});
    });
    setStudents(loadedStudents);
    setSessions(recentSessions);
    setRecords(nextRecords);
    setSummary(loadedSummary);
  }, [selectedClassId]);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  useFocusEffect(
    useCallback(() => {
      loadMatrix();
    }, [loadMatrix]),
  );

  useEffect(() => {
    loadMatrix();
  }, [loadMatrix]);

  const rate = summary.rate;

  const statusLabel = (status?: AttendanceRecord['status']) => {
    if (status === 'present' || status === 'late') {
      return 'P';
    }
    if (status === 'absent') {
      return 'A';
    }
    if (status === 'excused') {
      return 'E';
    }
    return '-';
  };

  return (
    <ScrollView
      style={[styles.container, {backgroundColor: theme.colors.background}]}
      contentContainerStyle={styles.content}>
      <Text style={[styles.title, {color: theme.colors.onSurface}]}>
        {t('attendanceMatrix')}
      </Text>
      <Text style={styles.subtitle}>{t('matrixHint')}</Text>
      <View style={styles.chipRow}>
        {classes.map(cls => (
          <Chip
            key={cls.id}
            selected={selectedClassId === cls.id}
            onPress={() => setSelectedClassId(cls.id)}
            style={styles.chip}>
            {cls.name}
          </Chip>
        ))}
      </View>
      <Card style={styles.card}>
        <Card.Content style={styles.statRow}>
          <View>
            <Text style={styles.statValue}>{students.length}</Text>
            <Text style={styles.statLabel}>{t('students')}</Text>
          </View>
          <View>
            <Text style={styles.statValue}>{summary.sessionCount}</Text>
            <Text style={styles.statLabel}>{t('sessions')}</Text>
          </View>
          <View>
            <Text style={styles.statValue}>{rate}%</Text>
            <Text style={styles.statLabel}>{t('attendanceRate')}</Text>
          </View>
        </Card.Content>
      </Card>
      <ScrollView horizontal>
        <DataTable style={styles.table}>
          <DataTable.Header>
            <DataTable.Title style={styles.nameColumn}>
              {t('students')}
            </DataTable.Title>
            {sessions.map(session => (
              <DataTable.Title
                key={session.id}
                numeric
                style={styles.sessionColumn}>
                {session.date.slice(5)}
              </DataTable.Title>
            ))}
          </DataTable.Header>
          {students.map(student => (
            <DataTable.Row key={student.id}>
              <DataTable.Cell style={styles.nameColumn}>
                {student.first_name} {student.last_name}
              </DataTable.Cell>
              {sessions.map(session => (
                <DataTable.Cell
                  key={session.id}
                  numeric
                  style={styles.sessionColumn}>
                  {statusLabel(records[session.id]?.[student.id])}
                </DataTable.Cell>
              ))}
            </DataTable.Row>
          ))}
        </DataTable>
      </ScrollView>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  content: {padding: 16, paddingBottom: 32},
  title: {fontSize: 28, fontWeight: '900'},
  subtitle: {marginTop: 6, marginBottom: 14, color: brand.muted},
  chipRow: {flexDirection: 'row', flexWrap: 'wrap', marginBottom: 14},
  chip: {marginRight: 8, marginBottom: 8},
  card: {marginBottom: 16, borderRadius: 24, ...shadow.card},
  statRow: {flexDirection: 'row', justifyContent: 'space-around'},
  statValue: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    color: brand.ink,
  },
  statLabel: {color: brand.muted, marginTop: 4, textAlign: 'center'},
  table: {minWidth: 520},
  nameColumn: {minWidth: 190},
  sessionColumn: {minWidth: 70, justifyContent: 'center'},
});

export default ClassAttendanceMatrixScreen;
