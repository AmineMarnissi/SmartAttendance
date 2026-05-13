import React, {useEffect, useMemo, useState} from 'react';
import {Alert, ScrollView, StyleSheet, Text, View} from 'react-native';
import {
  Avatar,
  Button,
  Card,
  Checkbox,
  Divider,
  List,
  useTheme,
} from 'react-native-paper';
import {studentRepository} from '../../services/database/studentRepository';
import {AttendanceService} from '../../services/attendance/AttendanceService';
import {AttendanceRecord, Student} from '../../types/models';
import {useAuthStore} from '../../store/useAuthStore';
import {usePreferencesStore} from '../../store/usePreferencesStore';
import {brand, shadow} from '../../theme/design';
import {attendanceRepository} from '../../services/database/attendanceRepository';

const ScanReviewScreen = ({navigation, route}: any) => {
  const {classId, results, scannedAt} = route.params;
  const theme = useTheme();
  const t = usePreferencesStore(state => state.t);
  const user = useAuthStore(state => state.user);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<
    Record<number, AttendanceRecord['status']>
  >({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const classStudents = await studentRepository.getForClass(classId);
        setStudents(classStudents);
        const initialAttendance: Record<number, AttendanceRecord['status']> =
          {};
        classStudents.forEach(student => {
          const match = results.find(
            (result: any) => result.studentId === student.id,
          );
          initialAttendance[student.id] = match ? 'present' : 'absent';
        });
        setAttendance(initialAttendance);
      } catch (error) {
        console.error('Failed to load review data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [classId, results]);

  const presentCount = useMemo(
    () =>
      Object.values(attendance).filter(
        status => status === 'present' || status === 'late',
      ).length,
    [attendance],
  );
  const rate =
    students.length > 0
      ? Math.round((presentCount / students.length) * 100)
      : 0;

  const toggleStatus = (studentId: number) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: prev[studentId] === 'present' ? 'absent' : 'present',
    }));
  };

  const handleConfirm = async () => {
    if (!user) {
      Alert.alert(t('error'), t('loginAgainSaveAttendance'));
      return;
    }
    setLoading(true);
    try {
      const sessionId = await AttendanceService.startSession(classId, user.id);
      const detectedResults = Object.entries(attendance)
        .filter(([, status]) => status === 'present' || status === 'late')
        .map(([id]) => ({
          studentId: parseInt(id, 10),
          confidence:
            results.find((result: any) => result.studentId === parseInt(id, 10))
              ?.confidence || 1,
        }));
      await AttendanceService.processResults(
        sessionId,
        classId,
        detectedResults,
      );
      const [savedSession, savedRecords] = await Promise.all([
        attendanceRepository.getSessionById(sessionId),
        attendanceRepository.getRecordsBySession(sessionId),
      ]);
      const savedPresentCount = savedRecords.filter(
        record => record.status === 'present' || record.status === 'late',
      ).length;
      const savedRate =
        savedRecords.length > 0
          ? Math.round((savedPresentCount / savedRecords.length) * 100)
          : 0;
      Alert.alert(
        t('attendanceSaved'),
        `${t('date')}: ${
          savedSession?.date ?? new Date().toISOString().split('T')[0]
        }\n${savedPresentCount}/${savedRecords.length} • ${savedRate}%`,
        [{text: 'OK', onPress: () => navigation.navigate('Home')}],
      );
    } catch (error) {
      Alert.alert(t('error'), t('failedSaveAttendance'));
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View
      style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <Card style={styles.summaryCard}>
        <Card.Content>
          <Text style={styles.title}>{t('reviewAttendance')}</Text>
          <Text style={styles.subtitle}>
            {scannedAt
              ? `${t('date')}: ${new Date(scannedAt).toLocaleString()}`
              : t('reviewAttendance')}
          </Text>
          <View style={styles.statRow}>
            <View>
              <Text style={styles.statValue}>{presentCount}</Text>
              <Text style={styles.statLabel}>{t('present')}</Text>
            </View>
            <View>
              <Text style={styles.statValue}>
                {students.length - presentCount}
              </Text>
              <Text style={styles.statLabel}>{t('absent')}</Text>
            </View>
            <View>
              <Text style={styles.statValue}>{rate}%</Text>
              <Text style={styles.statLabel}>{t('attendanceRate')}</Text>
            </View>
          </View>
        </Card.Content>
      </Card>
      <Divider />
      <ScrollView contentContainerStyle={styles.listContent}>
        <List.Section>
          {students.map(student => {
            const isPresent =
              attendance[student.id] === 'present' ||
              attendance[student.id] === 'late';
            return (
              <Card key={student.id} style={styles.studentCard}>
                <List.Item
                  title={`${student.first_name} ${student.last_name}`}
                  description={isPresent ? t('present') : t('absent')}
                  left={props => (
                    <Avatar.Text
                      {...props}
                      label={`${student.first_name[0] ?? ''}${
                        student.last_name[0] ?? ''
                      }`}
                      size={42}
                    />
                  )}
                  right={() => (
                    <Checkbox
                      status={isPresent ? 'checked' : 'unchecked'}
                      onPress={() => toggleStatus(student.id)}
                    />
                  )}
                  onPress={() => toggleStatus(student.id)}
                />
              </Card>
            );
          })}
        </List.Section>
      </ScrollView>
      <View style={styles.footer}>
        <Button
          mode="contained"
          onPress={handleConfirm}
          loading={loading}
          disabled={loading}
          contentStyle={styles.buttonContent}>
          {t('confirmSave')}
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  summaryCard: {margin: 16, borderRadius: 26, ...shadow.card},
  title: {fontSize: 24, fontWeight: '900', color: brand.ink},
  subtitle: {color: brand.muted, marginTop: 6},
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 18,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    color: brand.ink,
  },
  statLabel: {color: brand.muted, textAlign: 'center', marginTop: 4},
  listContent: {padding: 16, paddingBottom: 100},
  studentCard: {borderRadius: 20, marginBottom: 10},
  footer: {position: 'absolute', left: 16, right: 16, bottom: 16},
  buttonContent: {height: 52},
});

export default ScanReviewScreen;
