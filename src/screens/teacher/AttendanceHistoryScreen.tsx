import React, {useCallback, useState} from 'react';
import {FlatList, StyleSheet, Text, View} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {Avatar, Card, List, Paragraph, useTheme} from 'react-native-paper';
import {useAuthStore} from '../../store/useAuthStore';
import {attendanceRepository} from '../../services/database/attendanceRepository';
import {classRepository} from '../../services/database/classRepository';
import {usePreferencesStore} from '../../store/usePreferencesStore';
import {brand, shadow} from '../../theme/design';

const AttendanceHistoryScreen = () => {
  const theme = useTheme();
  const t = usePreferencesStore(state => state.t);
  const user = useAuthStore(state => state.user);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    if (!user) {
      setSessions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const classes =
        user.role === 'teacher'
          ? await classRepository.getByTeacher(user.id)
          : await classRepository.getAll();
      let allSessions: any[] = [];
      for (const cls of classes) {
        const classSessions = await attendanceRepository.getSessionsByClass(
          cls.id,
        );
        const sessionsWithClassName = await Promise.all(
          classSessions.map(async session => {
            const records = await attendanceRepository.getRecordsBySession(
              session.id,
            );
            const presentCount = records.filter(
              record => record.status === 'present' || record.status === 'late',
            ).length;
            const rate =
              records.length > 0
                ? Math.round((presentCount / records.length) * 100)
                : 0;
            return {
              ...session,
              className: cls.name,
              presentCount,
              totalCount: records.length,
              rate,
            };
          }),
        );
        allSessions = [...allSessions, ...sessionsWithClassName];
      }
      allSessions.sort(
        (a, b) =>
          new Date(b.start_time).getTime() - new Date(a.start_time).getTime(),
      );
      setSessions(allSessions);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory]),
  );

  const renderSession = useCallback(
    ({item}: {item: any}) => (
      <Card style={styles.card}>
        <List.Item
          title={item.className}
          description={`${t('date')}: ${item.date} • ${t(
            'started',
          )}: ${new Date(item.start_time).toLocaleTimeString()} • ${
            item.presentCount
          }/${item.totalCount} • ${item.rate}%`}
          left={props => (
            <Avatar.Icon {...props} icon="calendar-check" size={42} />
          )}
        />
      </Card>
    ),
    [t],
  );

  return (
    <View
      style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <Text style={[styles.title, {color: theme.colors.onSurface}]}>
        {t('attendanceHistory')}
      </Text>
      <FlatList
        data={sessions}
        renderItem={renderSession}
        keyExtractor={item => item.id.toString()}
        onRefresh={loadHistory}
        refreshing={loading}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Paragraph style={styles.empty}>
            {t('noAttendanceSessions')}
          </Paragraph>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  title: {fontSize: 28, fontWeight: '900', padding: 18},
  listContent: {padding: 16, paddingTop: 0},
  card: {borderRadius: 22, marginBottom: 10, ...shadow.card},
  empty: {textAlign: 'center', marginTop: 50, color: brand.muted},
});

export default AttendanceHistoryScreen;
