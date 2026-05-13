import React, {useEffect, useState} from 'react';
import {Alert, ScrollView, StyleSheet, Text, View} from 'react-native';
import {
  Avatar,
  Button,
  Card,
  RadioButton,
  TextInput,
  useTheme,
} from 'react-native-paper';
import {studentRepository} from '../../services/database/studentRepository';
import {classRepository} from '../../services/database/classRepository';
import {Class} from '../../types/models';
import {usePreferencesStore} from '../../store/usePreferencesStore';
import {brand, shadow} from '../../theme/design';

const StudentEnrollmentScreen = ({navigation}: any) => {
  const theme = useTheme();
  const t = usePreferencesStore(state => state.t);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [studentCode, setStudentCode] = useState('');
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');

  useEffect(() => {
    const loadClasses = async () => {
      try {
        const availableClasses = await classRepository.getAll();
        setClasses(availableClasses);
        if (!selectedClassId && availableClasses.length > 0) {
          setSelectedClassId(String(availableClasses[0].id));
        }
      } catch (error) {
        console.error('Failed to load classes for enrollment', error);
      }
    };
    loadClasses();
  }, [selectedClassId]);

  const handleNext = async () => {
    if (!firstName.trim() || !lastName.trim() || !studentCode.trim()) {
      Alert.alert(t('error'), t('fillRequiredFields'));
      return;
    }

    if (!selectedClassId) {
      Alert.alert(t('error'), t('selectClassForStudent'));
      return;
    }

    const existing = await studentRepository.getByCode(studentCode.trim());
    if (existing) {
      Alert.alert(t('error'), t('studentCodeExists'));
      return;
    }

    navigation.navigate('FaceCapture', {
      studentData: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        studentCode: studentCode.trim(),
        classId: parseInt(selectedClassId, 10),
      },
    });
  };

  return (
    <ScrollView
      style={[styles.container, {backgroundColor: theme.colors.background}]}
      contentContainerStyle={styles.content}>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.avatarContainer}>
            <Avatar.Icon icon="account-plus" size={80} style={styles.avatar} />
          </View>

          <Text style={[styles.title, {color: theme.colors.onSurface}]}>
            {t('newStudentEnrollment')}
          </Text>
          <Text style={styles.subtitle}>{t('studentsAndFacesSaved')}</Text>

          <TextInput
            label={`${t('firstName')} *`}
            value={firstName}
            onChangeText={setFirstName}
            style={styles.input}
            mode="outlined"
          />
          <TextInput
            label={`${t('lastName')} *`}
            value={lastName}
            onChangeText={setLastName}
            style={styles.input}
            mode="outlined"
          />
          <TextInput
            label={`${t('studentCode')} *`}
            value={studentCode}
            onChangeText={setStudentCode}
            style={styles.input}
            mode="outlined"
          />

          <View style={styles.classSelector}>
            <Text style={[styles.classLabel, {color: theme.colors.onSurface}]}>
              {t('assignToClass')} *
            </Text>
            {classes.length === 0 ? (
              <Text style={styles.classHint}>{t('createClassFirst')}</Text>
            ) : (
              <RadioButton.Group
                onValueChange={setSelectedClassId}
                value={selectedClassId}>
                {classes.map(cls => {
                  const selected = selectedClassId === String(cls.id);
                  return (
                    <View
                      key={cls.id}
                      style={[
                        styles.classRow,
                        selected && styles.classRowSelected,
                      ]}>
                      <RadioButton value={String(cls.id)} />
                      <Text style={styles.className}>
                        {cls.name}
                        {cls.grade ? ` • ${cls.grade}` : ''}
                      </Text>
                    </View>
                  );
                })}
              </RadioButton.Group>
            )}
          </View>

          <Button
            mode="contained"
            onPress={handleNext}
            style={styles.button}
            contentStyle={styles.buttonContent}
            disabled={classes.length === 0}>
            {t('nextCaptureFace')}
          </Button>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  content: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  card: {
    borderRadius: 32,
    ...shadow.card,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 18,
  },
  avatar: {backgroundColor: brand.primarySoft},
  title: {
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '900',
  },
  subtitle: {
    textAlign: 'center',
    color: brand.muted,
    marginTop: 6,
    marginBottom: 18,
  },
  input: {
    marginBottom: 14,
  },
  classSelector: {
    marginBottom: 16,
  },
  classLabel: {
    marginBottom: 8,
    fontWeight: '900',
  },
  classHint: {
    color: brand.muted,
  },
  classRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    marginBottom: 8,
    paddingRight: 10,
    backgroundColor: '#FFF7F7',
  },
  classRowSelected: {
    backgroundColor: brand.primarySoft,
  },
  className: {
    flex: 1,
    fontWeight: '800',
    color: brand.ink,
  },
  button: {
    marginTop: 10,
    borderRadius: 18,
  },
  buttonContent: {height: 52},
});

export default StudentEnrollmentScreen;
