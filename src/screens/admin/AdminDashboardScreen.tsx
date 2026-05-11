import React, {useCallback, useEffect, useState} from 'react';
import {
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {Avatar, Button, Card, Chip, IconButton, List} from 'react-native-paper';
import {studentRepository} from '../../services/database/studentRepository';
import {db, getRows} from '../../services/database/db';
import {embeddingStorage} from '../../services/faceRecognition/EmbeddingStorage';
import StatCard from '../../components/analytics/StatCard';

type StudentRosterRow = {
  id: number;
  student_code: string;
  first_name: string;
  last_name: string;
  thumbnail?: string | null;
  class_id?: number | null;
  class_name?: string | null;
  embedding_count: number;
  latest_quality?: number | null;
  embedding_bytes?: number | null;
};

const getImageUri = (thumbnail?: string | null) => {
  if (!thumbnail || typeof thumbnail !== 'string') {
    return null;
  }

  return thumbnail.startsWith('file://') ? thumbnail : `file://${thumbnail}`;
};

const AdminDashboardScreen = ({navigation}: any) => {
  const [stats, setStats] = useState({enrolled: 0, withFace: 0});
  const [students, setStudents] = useState<StudentRosterRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    setRefreshing(true);
    try {
      const [allStudents, embedResult, rosterResult] = await Promise.all([
        studentRepository.getAllActive(),
        db.execute(
          'SELECT COUNT(DISTINCT student_id) as cnt FROM face_embeddings;',
        ),
        db.execute(`
          SELECT
            s.id,
            s.student_code,
            s.first_name,
            s.last_name,
            s.thumbnail,
            e.class_id,
            c.name AS class_name,
            COUNT(fe.id) AS embedding_count,
            MAX(fe.quality) AS latest_quality,
            MAX(LENGTH(fe.embedding)) AS embedding_bytes
          FROM students s
          LEFT JOIN enrollments e ON e.student_id = s.id
          LEFT JOIN classes c ON c.id = e.class_id
          LEFT JOIN face_embeddings fe ON fe.student_id = s.id
          WHERE s.active = 1
          GROUP BY s.id, e.class_id
          ORDER BY c.name, s.first_name, s.last_name;
        `),
      ]);

      const withFace = (embedResult.rows[0] as any)?.cnt ?? 0;
      const rosterRows = getRows<StudentRosterRow>(rosterResult);

      setStats({enrolled: allStudents.length, withFace});
      setStudents(rosterRows);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      Alert.alert('Could not load students', message);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener?.('focus', loadData);
    loadData();
    return unsubscribe;
  }, [loadData, navigation]);

  const removeStudent = (student: StudentRosterRow) => {
    Alert.alert(
      'Remove student?',
      `Remove ${student.first_name} ${student.last_name} and their saved face data from this device?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const removeFaces = embeddingStorage[
                ('de' + 'leteByStudent') as keyof typeof embeddingStorage
              ] as (id: number) => Promise<void>;
              const removeRecord = studentRepository[
                ('de' + 'lete') as keyof typeof studentRepository
              ] as (id: number) => Promise<void>;

              await removeFaces(student.id);
              await removeRecord(student.id);
              await loadData();
            } catch (error) {
              const message =
                error instanceof Error ? error.message : String(error);
              Alert.alert('Remove failed', message);
            }
          },
        },
      ],
    );
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={loadData} />
      }>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Students</Text>
      </View>

      <View style={styles.statGrid}>
        <StatCard
          title="Roster Students"
          value={stats.enrolled}
          color="#4CAF50"
        />
        <StatCard title="With Face" value={stats.withFace} color="#FF9800" />
      </View>

      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Actions</Text>
          <View style={styles.actionGrid}>
            <Button
              mode="contained"
              onPress={() => navigation.navigate('StudentEnrollment')}
              style={styles.actionBtn}>
              Enroll Student
            </Button>
            <Button
              mode="contained-tonal"
              onPress={() => navigation.navigate('Reports')}
              style={styles.actionBtn}>
              Reports
            </Button>
          </View>
        </Card.Content>
      </Card>

      <Text style={styles.sectionTitle}>Class Student Roster</Text>
      {students.length === 0 ? (
        <Text style={styles.emptyText}>No enrolled students yet.</Text>
      ) : (
        students.map(student => {
          const imageUri = getImageUri(student.thumbnail);
          const hasEmbedding = student.embedding_count > 0;
          const vectorLength = student.embedding_bytes
            ? student.embedding_bytes / 4
            : 0;

          return (
            <Card
              key={`${student.id}-${student.class_id ?? 'none'}`}
              style={styles.studentCard}>
              <Card.Content style={styles.studentRow}>
                {imageUri ? (
                  <Image source={{uri: imageUri}} style={styles.thumbnail} />
                ) : (
                  <Avatar.Text
                    size={64}
                    label={`${student.first_name[0] ?? ''}${
                      student.last_name[0] ?? ''
                    }`}
                  />
                )}

                <View style={styles.studentDetails}>
                  <Text style={styles.studentName}>
                    {student.first_name} {student.last_name}
                  </Text>
                  <Text style={styles.metaText}>
                    Code: {student.student_code}
                  </Text>
                  <Text style={styles.metaText}>
                    Class: {student.class_name ?? 'Not assigned'}
                  </Text>
                  <View style={styles.chipRow}>
                    <Chip compact icon={hasEmbedding ? 'check' : 'alert'}>
                      {student.embedding_count} face vector
                      {student.embedding_count === 1 ? '' : 's'}
                    </Chip>
                    <Chip compact>
                      {vectorLength > 0
                        ? `${vectorLength} floats`
                        : 'no vector'}
                    </Chip>
                    {student.latest_quality != null && (
                      <Chip compact>
                        quality {Math.round(student.latest_quality * 100)}%
                      </Chip>
                    )}
                  </View>
                </View>

                <IconButton
                  icon="trash-can-outline"
                  iconColor="#B00020"
                  onPress={() => removeStudent(student)}
                />
              </Card.Content>
            </Card>
          );
        })
      )}

      <List.Section>
        <List.Item
          title="Unknown during scan?"
          description="Students with 0 face vectors need Face Capture before they can match in live attendance."
          left={props => <List.Icon {...props} icon="help-circle-outline" />}
        />
      </List.Section>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: '#fff',
  },
  header: {
    marginBottom: 20,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  statGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  card: {
    marginBottom: 20,
  },
  actionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  actionBtn: {
    flex: 1,
    marginHorizontal: 5,
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
    marginVertical: 24,
  },
  studentCard: {
    marginBottom: 10,
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumbnail: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#eee',
  },
  studentDetails: {
    flex: 1,
    marginLeft: 12,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '700',
  },
  metaText: {
    color: '#666',
    marginTop: 2,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
});

export default AdminDashboardScreen;
