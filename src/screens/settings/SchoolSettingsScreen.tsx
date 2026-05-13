import React, {useEffect, useState} from 'react';
import {StyleSheet, View, Alert} from 'react-native';
import {
  useTheme,
  TextInput,
  Button,
  Title,
  Subheading,
  ActivityIndicator,
} from 'react-native-paper';
import {schoolRepository, School} from '../../services/database/schoolRepository';

const SchoolSettingsScreen = () => {
  const theme = useTheme();
  const [school, setSchool] = useState<School | null>(null);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSchool();
  }, []);

  const loadSchool = async () => {
    setLoading(true);
    try {
      const schools = await schoolRepository.getAll();
      if (schools.length > 0) {
        setSchool(schools[0]);
        setName(schools[0].name);
      }
    } catch (error) {
      console.error('Failed to load school:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Erreur', 'le nom de l\'école est requis');
      return;
    }

    setSaving(true);
    try {
      if (school) {
        await schoolRepository.update(school.id, name.trim());
      } else {
        const id = await schoolRepository.create(name.trim());
        const newSchool = await schoolRepository.getById(id);
        setSchool(newSchool);
      }
      Alert.alert('Succès', 'Paramètres de l\'école enregistrés');
    } catch (error) {
      console.error('Failed to save school:', error);
      Alert.alert('Erreur', 'Impossible d\'enregistrer les paramètres');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <Title style={styles.title}>Paramètres de l'école</Title>
      <Subheading style={styles.subtitle}>
        Configurez les informations générales de votre établissement.
      </Subheading>

      <View style={styles.form}>
        <TextInput
          label="Nom de l'établissement"
          value={name}
          onChangeText={setName}
          mode="outlined"
          style={styles.input}
          placeholder="Ex: Lycée Pilote"
        />

        <Button
          mode="contained"
          onPress={handleSave}
          loading={saving}
          disabled={saving}
          style={styles.saveBtn}>
          Enregistrer les modifications
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    marginTop: 20,
  },
  subtitle: {
    marginBottom: 30,
    opacity: 0.7,
  },
  form: {
    marginTop: 10,
  },
  input: {
    marginBottom: 20,
  },
  saveBtn: {
    marginTop: 10,
    paddingVertical: 5,
  },
});

export default SchoolSettingsScreen;
