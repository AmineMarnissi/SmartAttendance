import React, {useState, useEffect} from 'react';
import {View, StyleSheet, ScrollView, Alert} from 'react-native';
import {
  Title,
  List,
  Checkbox,
  Avatar,
  Divider,
  FAB,
  useTheme,
} from 'react-native-paper';
import {studentRepository} from '../../services/database/studentRepository';
import {AttendanceService} from '../../services/attendance/AttendanceService';
import {AttendanceRecord, Student} from '../../types/models';
import {useAuthStore} from '../../store/useAuthStore';

const ScanReviewScreen = ({navigation, route}: any) => {
  const theme = useTheme();
  const {classId, results} = route.params;
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

        // Initialize attendance from scan results
        const initialAttendance: Record<number, AttendanceRecord['status']> =
          {};
        classStudents.forEach(s => {
          const match = results.find((r: any) => r.studentId === s.id);
          initialAttendance[s.id] = match ? 'present' : 'absent';
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

  const toggleStatus = (studentId: number) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: prev[studentId] === 'present' ? 'absent' : 'present',
    }));
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const sessionId = await AttendanceService.startSession(classId, user.id);

      // Actually, let's just use a modified version of AttendanceService.processResults or call it
      const detectedResults = Object.entries(attendance)
        .filter(([_, status]) => status === 'present')
        .map(([id, _]) => ({
          studentId: parseInt(id, 10),
          confidence:
            results.find((r: any) => r.studentId === parseInt(id, 10))
              ?.confidence || 1.0,
        }));

      await AttendanceService.processResults(
        sessionId,
        classId,
        detectedResults,
      );

      Alert.alert('Succès', 'La présence a été enregistrée avec succès.', [
        {
          text: 'OK',
          onPress: () =>
            navigation.navigate('Classes', {
              screen: 'Reports',
            }),
        },
      ]);
    } catch (error) {
      Alert.alert('Erreur', "Échec de l'enregistrement de la présence.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <Title style={[styles.title, {color: theme.colors.onSurface}]}>
        Vérification de Présence
      </Title>
      <Divider />

      <ScrollView contentContainerStyle={styles.listContent}>
        <List.Section>
          {students.map(student => (
            <List.Item
              key={student.id}
              title={`${student.first_name} ${student.last_name}`}
              titleStyle={{color: theme.colors.onSurface}}
              description={attendance[student.id] === 'present' ? 'PRÉSENT' : 'ABSENT'}
              descriptionStyle={{color: theme.colors.onSurfaceVariant}}
              left={props => (
                <Avatar.Text
                  {...props}
                  label={student.first_name[0] + student.last_name[0]}
                  size={40}
                />
              )}
              right={() => (
                <Checkbox
                  status={
                    attendance[student.id] === 'present'
                      ? 'checked'
                      : 'unchecked'
                  }
                  onPress={() => toggleStatus(student.id)}
                />
              )}
              onPress={() => toggleStatus(student.id)}
            />
          ))}
        </List.Section>
      </ScrollView>

      <FAB
        style={[styles.fab, {backgroundColor: theme.colors.primary}]}
        icon="check"
        label="Confirmer & Enregistrer"
        onPress={handleConfirm}
        loading={loading}
        disabled={loading}
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
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 24,
  },
  listContent: {
    paddingBottom: 112,
  },
});

export default ScanReviewScreen;
