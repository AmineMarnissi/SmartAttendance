import React, {useEffect, useState, useCallback} from 'react';
import {StyleSheet, View, FlatList, Alert, Text} from 'react-native';
import {
  useTheme,
  List,
  FAB,
  Portal,
  Dialog,
  TextInput,
  Button,
  IconButton,
} from 'react-native-paper';
import {classRepository} from '../../services/database/classRepository';
import {userRepository} from '../../services/database/userRepository';
import {Class, User} from '../../types/models';

const ClassManagementScreen = () => {
  const theme = useTheme();
  const [classes, setClasses] = useState<Class[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('');
  const [teacherId, setTeacherId] = useState<number | undefined>(undefined);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [allClasses, allTeachers] = await Promise.all([
        classRepository.getAll(),
        userRepository.getByRole('teacher'),
      ]);
      setClasses(allClasses);
      setTeachers(allTeachers);
    } catch (error) {
      console.error('Failed to load classes:', error);
      Alert.alert('Erreur', 'Impossible de charger les classes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddEdit = async () => {
    if (!name.trim()) {
      Alert.alert('Erreur', 'Le nom de la classe est requis');
      return;
    }

    try {
      if (editingClass) {
        await classRepository.update(editingClass.id, {
          name: name.trim(),
          grade: grade.trim(),
          teacher_id: teacherId,
        });
      } else {
        await classRepository.create({
          name: name.trim(),
          grade: grade.trim(),
          teacher_id: teacherId,
          school_id: 1, // Default school for now
        });
      }
      setDialogVisible(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Failed to save class:', error);
      Alert.alert('Erreur', 'Impossible d\'enregistrer la classe');
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert(
      'Supprimer',
      'Êtes-vous sûr de vouloir supprimer cette classe ?',
      [
        {text: 'Annuler', style: 'cancel'},
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await classRepository.delete(id);
            loadData();
          },
        },
      ],
    );
  };

  const openDialog = (cls: Class | null = null) => {
    if (cls) {
      setEditingClass(cls);
      setName(cls.name);
      setGrade(cls.grade || '');
      setTeacherId(cls.teacher_id);
    } else {
      resetForm();
    }
    setDialogVisible(true);
  };

  const resetForm = () => {
    setEditingClass(null);
    setName('');
    setGrade('');
    setTeacherId(undefined);
  };

  const getTeacherName = useCallback((tId?: number) => {
    if (!tId) return 'Aucun enseignant';
    const teacher = teachers.find(t => t.id === tId);
    return teacher ? teacher.name : 'Inconnu';
  }, [teachers]);

  return (
    <View style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <FlatList
        data={classes}
        keyExtractor={item => item.id.toString()}
        renderItem={({item}) => (
          <List.Item
            title={item.name}
            description={`Niveau: ${item.grade || 'N/A'} • Enseignant: ${getTeacherName(item.teacher_id)}`}
            left={_props => <List.Icon {..._props} icon="google-classroom" />}
            right={_props => (
              <View style={styles.actions}>
                <IconButton
                  icon="pencil"
                  size={20}
                  onPress={() => openDialog(item)}
                />
                <IconButton
                  icon="delete"
                  size={20}
                  iconColor={theme.colors.error}
                  onPress={() => handleDelete(item.id)}
                />
              </View>
            )}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.emptyText}>Aucune classe trouvée</Text>
          ) : null
        }
      />

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => openDialog()}
        label="Ajouter une classe"
      />

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>
            {editingClass ? 'Modifier la classe' : 'Nouvelle classe'}
          </Dialog.Title>
          <Dialog.ScrollArea style={{maxHeight: 400, paddingHorizontal: 0}}>
            <FlatList
              data={[]}
              renderItem={null}
              ListHeaderComponent={
                <View style={{padding: 20}}>
                  <TextInput
                    label="Nom de la classe"
                    value={name}
                    onChangeText={setName}
                    mode="outlined"
                    style={styles.input}
                  />
                  <TextInput
                    label="Niveau / Grade"
                    value={grade}
                    onChangeText={setGrade}
                    mode="outlined"
                    style={styles.input}
                  />
                  
                  <Text style={styles.label}>Attribuer à un enseignant :</Text>
                  {teachers.map(t => (
                    <Button
                      key={t.id}
                      mode={teacherId === t.id ? 'contained' : 'outlined'}
                      onPress={() => setTeacherId(t.id)}
                      style={styles.teacherBtn}
                      labelStyle={{fontSize: 12}}>
                      {t.name}
                    </Button>
                  ))}
                  <Button
                    mode={teacherId === undefined ? 'contained' : 'outlined'}
                    onPress={() => setTeacherId(undefined)}
                    style={styles.teacherBtn}
                    labelStyle={{fontSize: 12}}>
                    Aucun
                  </Button>
                </View>
              }
            />
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Annuler</Button>
            <Button onPress={handleAddEdit}>Enregistrer</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 80,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  actions: {
    flexDirection: 'row',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  input: {
    marginBottom: 12,
  },
  label: {
    marginTop: 10,
    marginBottom: 10,
    fontWeight: 'bold',
  },
  teacherBtn: {
    marginBottom: 5,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    opacity: 0.6,
  },
});

export default ClassManagementScreen;
