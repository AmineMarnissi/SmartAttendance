import React, {useState, useEffect} from 'react';
import {View, StyleSheet, FlatList, Alert} from 'react-native';
import {
  List,
  FAB,
  Portal,
  Dialog,
  TextInput,
  Button,
  useTheme,
  ActivityIndicator,
} from 'react-native-paper';
import {classRepository} from '../../services/database/classRepository';
import {userRepository} from '../../services/database/userRepository';
import {Class, User} from '../../types/models';

const ManageClassesScreen = () => {
  const theme = useTheme();
  const [classes, setClasses] = useState<Class[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);
  const [className, setClassName] = useState('');
  const [grade, setGrade] = useState('');
  const [editingClass, setEditingClass] = useState<Class | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [allClasses, allTeachers] = await Promise.all([
        classRepository.getAll(),
        userRepository.getByRole('teacher'),
      ]);
      setClasses(allClasses);
      setTeachers(allTeachers);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!className || !grade) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs.');
      return;
    }

    try {
      if (editingClass) {
        await classRepository.update(editingClass.id, {
          name: className,
          grade,
        });
      } else {
        await classRepository.create({
          name: className,
          grade,
          teacher_id: teachers[0]?.id || 1, // Par défaut au premier enseignant
          school_id: 1,
          schedule: '[]',
        });
      }
      hideDialog();
      loadData();
    } catch {
      Alert.alert('Erreur', "Échec de l'enregistrement.");
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert('Supprimer', 'Voulez-vous vraiment supprimer cette classe ?', [
      {text: 'Annuler', style: 'cancel'},
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          await classRepository.delete(id);
          loadData();
        },
      },
    ]);
  };

  const showDialog = (cls?: Class) => {
    if (cls) {
      setEditingClass(cls);
      setClassName(cls.name);
      setGrade(cls.grade || '');
    } else {
      setEditingClass(null);
      setClassName('');
      setGrade('');
    }
    setVisible(true);
  };

  const hideDialog = () => {
    setVisible(false);
  };

  return (
    <View style={[styles.container, {backgroundColor: theme.colors.background}]}>
      {loading ? (
        <ActivityIndicator style={styles.loader} />
      ) : (
        <FlatList
          data={classes}
          keyExtractor={item => item.id.toString()}
          renderItem={({item}) => (
            <List.Item
              title={item.name}
              description={`Niveau: ${item.grade || 'N/A'}`}
              left={props => <List.Icon {...props} icon="google-classroom" />}
              right={() => (
                <View style={styles.row}>
                  <Button onPress={() => showDialog(item)}>Modifier</Button>
                  <Button textColor={theme.colors.error} onPress={() => handleDelete(item.id)}>Supprimer</Button>
                </View>
              )}
            />
          )}
        />
      )}

      <Portal>
        <Dialog visible={visible} onDismiss={hideDialog}>
          <Dialog.Title>{editingClass ? 'Modifier la classe' : 'Nouvelle classe'}</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Nom de la classe"
              value={className}
              onChangeText={setClassName}
              style={styles.input}
            />
            <TextInput
              label="Niveau"
              value={grade}
              onChangeText={setGrade}
              style={styles.input}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={hideDialog}>Annuler</Button>
            <Button onPress={handleSave}>Enregistrer</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <FAB
        icon="plus"
        style={[styles.fab, {backgroundColor: theme.colors.primary}]}
        onPress={() => showDialog()}
        label="Ajouter"
        color="white"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loader: {
    marginTop: 50,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  input: {
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
  }
});

export default ManageClassesScreen;
