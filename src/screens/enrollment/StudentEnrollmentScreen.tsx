import React, {useEffect, useState} from 'react';
import {View, StyleSheet, ScrollView, Alert, Text} from 'react-native';
import {
  TextInput,
  Button,
  Title,
  Surface,
  Avatar,
  RadioButton,
} from 'react-native-paper';
import {studentRepository} from '../../services/database/studentRepository';
import {classRepository} from '../../services/database/classRepository';
import {Class} from '../../types/models';

const StudentEnrollmentScreen = ({navigation}: any) => {
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
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!selectedClassId) {
      Alert.alert('Error', 'Please select a class for this student');
      return;
    }

    // Check if code exists
    const existing = await studentRepository.getByCode(studentCode);
    if (existing) {
      Alert.alert('Error', 'Student code already exists');
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
    <ScrollView contentContainerStyle={styles.container}>
      <Surface style={styles.surface}>
        <Title style={styles.title}>New Student Enrollment</Title>

        <View style={styles.avatarContainer}>
          <Avatar.Icon icon="account-plus" size={80} />
        </View>

        <TextInput
          label="First Name *"
          value={firstName}
          onChangeText={setFirstName}
          style={styles.input}
        />
        <TextInput
          label="Last Name *"
          value={lastName}
          onChangeText={setLastName}
          style={styles.input}
        />
        <TextInput
          label="Student Code *"
          value={studentCode}
          onChangeText={setStudentCode}
          style={styles.input}
        />

        <View style={styles.classSelector}>
          <Text style={styles.classLabel}>Assign To Class *</Text>
          {classes.length === 0 ? (
            <Text style={styles.classHint}>
              Create a class first before enrolling students.
            </Text>
          ) : (
            <RadioButton.Group
              onValueChange={setSelectedClassId}
              value={selectedClassId}>
              {classes.map(cls => (
                <View key={cls.id} style={styles.classRow}>
                  <RadioButton value={String(cls.id)} />
                  <Text>
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
          Next: Capture Face
        </Button>
      </Surface>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
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
    color: '#666',
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
