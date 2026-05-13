import React, {useState, useEffect} from 'react';
import {StyleSheet, ScrollView, Alert, Text} from 'react-native';
import {List, Button, Card, useTheme} from 'react-native-paper';
import {classRepository} from '../../services/database/classRepository';
import {attendanceRepository} from '../../services/database/attendanceRepository';
import {CSVExportService} from '../../services/export/CSVExportService';
import {Class} from '../../types/models';
import {studentRepository} from '../../services/database/studentRepository';
import {userRepository} from '../../services/database/userRepository';

const ReportsScreen = () => {
  const theme = useTheme();
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
      const [cls, sessions, students] = await Promise.all([
        classRepository.getById(classId),
        attendanceRepository.getSessionsByClass(classId),
        studentRepository.getForClass(classId),
      ]);
      const teacher = cls?.teacher_id
        ? await userRepository.getById(cls.teacher_id)
        : null;
      const generatedAt = new Date().toLocaleString();
      const reportData: Record<string, unknown>[] = [];

      for (const session of sessions) {
        const records = await attendanceRepository.getRecordsBySession(
          session.id,
        );
        const recordsByStudent = new Map(
          records.map(record => [record.student_id, record]),
        );

        students.forEach(student => {
          const record = recordsByStudent.get(student.id);
          reportData.push({
            Professeur: teacher?.name ?? 'N/A',
            Classe: cls?.name ?? className,
            Niveau: cls?.grade ?? 'N/A',
            'Date session': session.date,
            'Heure session': session.start_time
              ? new Date(session.start_time).toLocaleTimeString()
              : 'N/A',
            'Genere le': generatedAt,
            'Code etudiant': student.student_code,
            'Nom etudiant': `${student.first_name} ${student.last_name}`,
            'Etat presence': record?.status ?? 'absent',
            'Heure arrivee': record?.arrival_time
              ? new Date(record.arrival_time).toLocaleTimeString()
              : 'N/A',
            Methode: record?.method ?? 'manual',
            Confiance: record?.confidence
              ? `${Math.round(record.confidence * 100)}%`
              : '0%',
          });
        });
      }

      if (reportData.length === 0) {
        Alert.alert(
          'Aucune donnée',
          'Aucune session de présence trouvée pour cette classe.',
        );
        return;
      }

      await CSVExportService.exportAttendanceExcel(
        reportData,
        `Rapport_Presence_${className.replace(/\s/g, '_')}_${
          new Date().toISOString().split('T')[0]
        }`,
      );
    } catch (error) {
      Alert.alert(
        "Échec de l'exportation",
        'Une erreur est survenue lors de la génération du rapport.',
      );
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, {backgroundColor: theme.colors.background}]}
      contentContainerStyle={styles.contentContainer}>
      <Text style={[styles.title, {color: theme.colors.onSurface}]}>
        Exporter des rapports
      </Text>
      <Card
        style={[
          styles.card,
          {backgroundColor: theme.colors.elevation.level1},
        ]}>
        <Card.Content>
          <Text style={{color: theme.colors.onSurfaceVariant}}>
            Générez et partagez des rapports de présence au format Excel.
          </Text>
        </Card.Content>
      </Card>

      <List.Section>
        <Text style={[styles.sectionTitle, {color: theme.colors.onSurface}]}>
          Sélectionnez une classe pour le rapport
        </Text>
        {classes.map(cls => (
          <List.Item
            key={cls.id}
            title={cls.name}
            titleStyle={{color: theme.colors.onSurface}}
            description={`Niveau : ${cls.grade || 'N/A'}`}
            descriptionStyle={{color: theme.colors.onSurfaceVariant}}
            left={props => <List.Icon {...props} icon="file-export" />}
            right={() => (
              <Button
                mode="outlined"
                onPress={() => exportClassReport(cls.id, cls.name)}
                loading={loading}
                disabled={loading}>
                Exporter
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
  },
  contentContainer: {
    paddingBottom: 120,
  },
  title: {
    padding: 20,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
  },
  card: {
    margin: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
});

export default ReportsScreen;
