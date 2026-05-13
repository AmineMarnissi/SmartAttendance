import React, {useEffect, useState} from 'react';
import {View, StyleSheet, ScrollView, Alert, Text} from 'react-native';
import {
  TextInput,
  Button,
  Title,
  Surface,
  Avatar,
  RadioButton,
  useTheme,
} from 'react-native-paper';
import {studentRepository} from '../../services/database/studentRepository';
import {classRepository} from '../../services/database/classRepository';
import {Class} from '../../types/models';

const StudentEnrollmentScreen = ({navigation}: any) => {
  const theme = useTheme();
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
      } catch (error) {
        console.error('Failed to load classes for enrollment', error);
      }
    };
    loadClasses();
  }, []);

  const handleNext = async () => {
    if (!firstName || !lastName || !studentCode) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (!selectedClassId) {
      Alert.alert('Erreur', 'Veuillez sélectionner une classe pour cet élève');
      return;
    }

    // Check if code exists
    const existing = await studentRepository.getByCode(studentCode);
    if (existing) {
      Alert.alert('Erreur', 'Le code étudiant existe déjà');
      return;
    }

    navigation.navigate('FaceCapture', {
      studentData: {
        firstName,
        lastName,
        studentCode,
        classId: parseInt(selectedClassId, 10),
      },
    });
  };

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        {backgroundColor: theme.colors.background},
      ]}>
      <Surface
        style={[
          styles.surface,
          {backgroundColor: theme.colors.elevation.level2},
        ]}>
        <Title style={[styles.title, {color: theme.colors.onSurface}]}>
          Inscription d'un nouvel élève
        </Title>

        <View style={styles.avatarContainer}>
          <Avatar.Icon icon="account-plus" size={80} />
        </View>

        <TextInput
          label="Prénom *"
          value={firstName}
          onChangeText={setFirstName}
          style={styles.input}
        />
        <TextInput
          label="Nom *"
          value={lastName}
          onChangeText={setLastName}
          style={styles.input}
        />
        <TextInput
          label="Code étudiant *"
          value={studentCode}
          onChangeText={setStudentCode}
          style={styles.input}
        />

        <View style={styles.classSelector}>
          <Text style={[styles.classLabel, {color: theme.colors.onSurface}]}>
            Assigner à une classe *
          </Text>
          {classes.length === 0 ? (
            <Text
              style={[styles.classHint, {color: theme.colors.onSurfaceVariant}]}>
              Créez d'abord une classe avant d'inscrire des élèves.
            </Text>
          ) : (
            <RadioButton.Group
              onValueChange={setSelectedClassId}
              value={selectedClassId}>
              {classes.map(cls => (
                <View key={cls.id} style={styles.classRow}>
                  <RadioButton value={String(cls.id)} />
                  <Text style={{color: theme.colors.onSurface}}>
                    {cls.name}
                    {cls.grade ? ` • ${cls.grade}` : ''}
                  </Text>
                </View>
              ))}
            </RadioButton.Group>
          )}
        </View>

        <Button
          mode="contained"
          onPress={handleNext}
          style={styles.button}
          disabled={classes.length === 0}>
          Suivant : Capturer le visage
        </Button>
      </Surface>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  surface: {
    padding: 20,
    borderRadius: 10,
    elevation: 4,
  },
  title: {
    textAlign: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  input: {
    marginBottom: 15,
  },
  classSelector: {
    marginBottom: 16,
  },
  classLabel: {
    marginBottom: 8,
  },
  classHint: {
  },
  classRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  button: {
    marginTop: 10,
  },
});

export default StudentEnrollmentScreen;
