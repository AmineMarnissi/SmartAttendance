import React, {useState, useEffect, useCallback} from 'react';
import {View, StyleSheet, FlatList} from 'react-native';
import {
  List,
  Avatar,
  Paragraph,
  useTheme,
} from 'react-native-paper';
import {useAuthStore} from '../../store/useAuthStore';
import {attendanceRepository} from '../../services/database/attendanceRepository';
import {classRepository} from '../../services/database/classRepository';

const AttendanceHistoryScreen = ({navigation}: any) => {
  const theme = useTheme();
  const user = useAuthStore(state => state.user);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    try {
      const classes = await classRepository.getByTeacher(user.id);
      let allSessions: any[] = [];
      for (const cls of classes) {
        const classSessions = await attendanceRepository.getSessionsByClass(
          cls.id,
        );
        const sessionsWithClassName = classSessions.map(s => ({
          ...s,
          className: cls.name,
        }));
        allSessions = [...allSessions, ...sessionsWithClassName];
      }

      allSessions.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
      setSessions(allSessions);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const renderSession = useCallback(
    ({item}: {item: any}) => (
      <List.Item
        title={item.className}
        titleStyle={{color: theme.colors.onSurface}}
        description={`Date : ${item.date} | Début : ${new Date(
          item.start_time,
        ).toLocaleTimeString()}`}
        descriptionStyle={{color: theme.colors.onSurfaceVariant}}
        left={props => (
          <Avatar.Icon {...props} icon="calendar-check" size={40} />
        )}
        right={props => <List.Icon {...props} icon="chevron-right" />}
        onPress={() => navigation.navigate('SessionDetail', {
          sessionId: item.id,
          className: item.className,
          date: item.date
        })}
      />
    ),
    [theme.colors.onSurface, theme.colors.onSurfaceVariant, navigation],
  );

  return (
    <View style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <FlatList
        data={sessions}
        renderItem={renderSession}
        keyExtractor={item => item.id.toString()}
        onRefresh={loadHistory}
        refreshing={loading}
        ListEmptyComponent={
          <Paragraph
            style={[styles.empty, {color: theme.colors.onSurfaceVariant}]}>
            Aucune session de présence trouvée.
          </Paragraph>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    padding: 20,
    textAlign: 'center',
  },
  empty: {
    textAlign: 'center',
    marginTop: 50,
  },
});

export default AttendanceHistoryScreen;
