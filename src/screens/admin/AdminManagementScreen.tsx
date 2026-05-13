import React, {useCallback, useEffect, useState} from 'react';
import {Alert, ScrollView, StyleSheet, Text, View} from 'react-native';
import {
  Button,
  Card,
  Chip,
  Divider,
  TextInput,
  useTheme,
} from 'react-native-paper';
import {AuthService} from '../../services/auth/AuthService';
import {classRepository} from '../../services/database/classRepository';
import {userRepository} from '../../services/database/userRepository';
import {Class, User} from '../../types/models';
import {usePreferencesStore} from '../../store/usePreferencesStore';

const AdminManagementScreen = () => {
  const theme = useTheme();
  const t = usePreferencesStore(state => state.t);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [teacherName, setTeacherName] = useState('');
  const [teacherPin, setTeacherPin] = useState('1234');
  const [className, setClassName] = useState('');
  const [grade, setGrade] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | null>(
    null,
  );
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    const [loadedTeachers, loadedClasses] = await Promise.all([
      userRepository.getByRole('teacher'),
      classRepository.getAll(),
    ]);
    setTeachers(loadedTeachers);
    setClasses(loadedClasses);
    if (!selectedTeacherId && loadedTeachers.length > 0) {
      setSelectedTeacherId(loadedTeachers[0].id);
    }
  }, [selectedTeacherId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddTeacher = async () => {
    if (!teacherName.trim()) {
      Alert.alert('Missing name', 'Enter teacher name.');
      return;
    }
    setSaving(true);
    try {
      await AuthService.setupPin(teacherName, 'teacher', teacherPin);
      setTeacherName('');
      setTeacherPin('1234');
      await loadData();
    } catch (error) {
      Alert.alert(
        'Could not add teacher',
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleAddClass = async () => {
    if (!className.trim()) {
      Alert.alert('Missing class', 'Enter class name.');
      return;
    }
    setSaving(true);
    try {
      await classRepository.create({
        name: className.trim(),
        grade: grade.trim() || undefined,
        teacher_id: selectedTeacherId ?? undefined,
        schedule: JSON.stringify([]),
      });
      setClassName('');
      setGrade('');
      await loadData();
    } catch (error) {
      Alert.alert(
        'Could not add class',
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      setSaving(false);
    }
  };

  const teacherNameById = (id?: number) =>
    teachers.find(teacher => teacher.id === id)?.name ?? 'Unassigned';

  return (
    <ScrollView
      style={[styles.container, {backgroundColor: theme.colors.background}]}
      contentContainerStyle={styles.content}>
      <Text style={[styles.title, {color: theme.colors.onSurface}]}>
        {t('manageSchool')}
      </Text>
      <Text style={styles.subtitle}>
        Modern admin workspace for teachers, classes and role-based access.
      </Text>

      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>{t('addTeacher')}</Text>
          <TextInput
            label={t('fullName')}
            value={teacherName}
            onChangeText={setTeacherName}
            style={styles.input}
          />
          <TextInput
            label={t('pin')}
            value={teacherPin}
            onChangeText={setTeacherPin}
            secureTextEntry
            keyboardType="numeric"
            style={styles.input}
          />
          <Button
            mode="contained"
            onPress={handleAddTeacher}
            loading={saving}
            disabled={saving}>
            {t('save')}
          </Button>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>{t('addClass')}</Text>
          <TextInput
            label={t('className')}
            value={className}
            onChangeText={setClassName}
            style={styles.input}
          />
          <TextInput
            label={t('grade')}
            value={grade}
            onChangeText={setGrade}
            style={styles.input}
          />
          <Text style={styles.smallTitle}>{t('teacher')}</Text>
          <View style={styles.chipRow}>
            {teachers.map(teacher => (
              <Chip
                key={teacher.id}
                selected={selectedTeacherId === teacher.id}
                onPress={() => setSelectedTeacherId(teacher.id)}
                style={styles.chip}>
                {teacher.name}
              </Chip>
            ))}
          </View>
          <Button
            mode="contained"
            onPress={handleAddClass}
            loading={saving}
            disabled={saving}>
            {t('save')}
          </Button>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>{t('teachers')}</Text>
          {teachers.map(teacher => (
            <View key={teacher.id} style={styles.listRow}>
              <Text style={styles.rowTitle}>{teacher.name}</Text>
              <Chip compact>{t('teacher')}</Chip>
            </View>
          ))}
          <Divider style={styles.divider} />
          <Text style={styles.sectionTitle}>{t('classes')}</Text>
          {classes.map(cls => (
            <View key={cls.id} style={styles.listRow}>
              <View>
                <Text style={styles.rowTitle}>{cls.name}</Text>
                <Text style={styles.meta}>
                  {cls.grade ?? 'No grade'} • {teacherNameById(cls.teacher_id)}
                </Text>
              </View>
            </View>
          ))}
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  content: {padding: 16, paddingBottom: 32},
  title: {fontSize: 28, fontWeight: '900', letterSpacing: -0.6},
  subtitle: {marginTop: 6, marginBottom: 18, color: '#64748B'},
  card: {marginBottom: 16, borderRadius: 24},
  sectionTitle: {fontSize: 18, fontWeight: '800', marginBottom: 12},
  smallTitle: {fontWeight: '700', marginBottom: 8},
  input: {marginBottom: 12},
  chipRow: {flexDirection: 'row', flexWrap: 'wrap', marginBottom: 14},
  chip: {marginRight: 8, marginBottom: 8},
  listRow: {
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowTitle: {fontWeight: '800', fontSize: 15},
  meta: {color: '#64748B', marginTop: 3},
  divider: {marginVertical: 14},
});

export default AdminManagementScreen;
