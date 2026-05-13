import React, {useEffect, useState, useCallback} from 'react';
import {View, StyleSheet, FlatList} from 'react-native';
import {
  Title,
  List,
  Text,
  ActivityIndicator,
  useTheme,
  Divider,
} from 'react-native-paper';
import {attendanceRepository} from '../../services/database/attendanceRepository';
import {studentRepository} from '../../services/database/studentRepository';
import StudentThumbnail from '../../components/StudentThumbnail';

const SessionDetailScreen = ({route}: any) => {
  const {sessionId, className, date} = route.params;
  const theme = useTheme();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDetails = useCallback(async () => {
    try {
      setLoading(true);
      const sessionRecords = await attendanceRepository.getRecordsBySession(sessionId);
      const studentDetails = await Promise.all(
        sessionRecords.map(async (r) => {
          const student = await studentRepository.getById(r.student_id);
          return {...r, student};
        })
      );
      setRecords(studentDetails);
    } catch (error) {
      console.error('[SessionDetail] Failed to load records:', error);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  const renderRecord = ({item}: {item: any}) => (
    <List.Item
      title={`${item.student?.first_name} ${item.student?.last_name}`}
      description={`Statut : ${item.status === 'present' ? 'PRÉSENT' : 'ABSENT'} | Heure : ${item.arrival_time ? new Date(item.arrival_time).toLocaleTimeString() : 'N/A'}`}
      left={() => (
        <View style={styles.avatarContainer}>
          <StudentThumbnail thumbnail={item.student?.thumbnail} size={40} />
        </View>
      )}
      right={() => (
        <Text style={[
          styles.statusText,
          {color: item.status === 'present' ? '#4CAF50' : '#F44336'}
        ]}>
          {item.status === 'present' ? 'PRÉSENT' : 'ABSENT'}
        </Text>
      )}
    />
  );

  return (
    <View style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <View style={styles.header}>
        <Title>{className}</Title>
        <Text style={{color: theme.colors.onSurfaceVariant}}>{date}</Text>
      </View>
      
      <Divider />

      {loading ? (
        <ActivityIndicator style={styles.loader} />
      ) : (
        <FlatList
          data={records}
          renderItem={renderRecord}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>Aucun enregistrement trouvé pour cette session.</Text>}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  loader: {
    marginTop: 50,
  },
  list: {
    paddingBottom: 20,
  },
  avatarContainer: {
    justifyContent: 'center',
    paddingLeft: 10,
  },
  statusText: {
    alignSelf: 'center',
    fontWeight: 'bold',
    marginRight: 10,
  },
  empty: {
    textAlign: 'center',
    marginTop: 50,
    color: '#666',
  }
});

export default SessionDetailScreen;
