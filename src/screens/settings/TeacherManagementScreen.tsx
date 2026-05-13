import React, {useEffect, useState, useCallback} from 'react';
import {StyleSheet, View, FlatList, Alert} from 'react-native';
import {
  useTheme,
  List,
  FAB,
  Portal,
  Dialog,
  TextInput,
  Button,
  IconButton,
  Text,
} from 'react-native-paper';
import {userRepository} from '../../services/database/userRepository';
import {AuthService} from '../../services/auth/AuthService';
import {User} from '../../types/models';

const TeacherManagementScreen = () => {
  const theme = useTheme();
  const [teachers, setTeachers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogVisible, setDialogVisible] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const allTeachers = await userRepository.getByRole('teacher');
      setTeachers(allTeachers);
    } catch (error) {
      console.error('Failed to load teachers:', error);
      Alert.alert('Erreur', 'Impossible de charger les enseignants');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAdd = async () => {
    if (!name.trim()) {
      Alert.alert('Erreur', 'Le nom est requis');
      return;
    }
    if (!/^\d{4,}$/.test(pin)) {
      Alert.alert('Erreur', 'Le PIN doit contenir au moins 4 chiffres');
      return;
    }

    try {
      await AuthService.setupPin(name.trim(), 'teacher', pin);
      setDialogVisible(false);
      resetForm();
      loadData();
    } catch (error: any) {
      console.error('Failed to save teacher:', error);
      Alert.alert('Erreur', error.message || 'Impossible d\'enregistrer l\'enseignant');
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert(
      'Supprimer',
      'Êtes-vous sûr de vouloir supprimer cet enseignant ?',
      [
        {text: 'Annuler', style: 'cancel'},
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await userRepository.delete(id);
            loadData();
          },
        },
      ],
    );
  };

  const resetForm = () => {
    setName('');
    setPin('');
  };

  return (
    <View style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <FlatList
        data={teachers}
        keyExtractor={item => item.id.toString()}
        renderItem={({item}) => (
          <List.Item
            title={item.name}
            description={`ID: ${item.id} • Créé le: ${new Date(item.created_at).toLocaleDateString()}`}
            left={_props => <List.Icon {..._props} icon="account-tie" />}
            right={_props => (
              <IconButton
                icon="delete"
                iconColor={theme.colors.error}
                onPress={() => handleDelete(item.id)}
              />
            )}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.emptyText}>Aucun enseignant trouvé</Text>
          ) : null
        }
      />

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => setDialogVisible(true)}
        label="Ajouter un enseignant"
      />

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>Nouvel Enseignant</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Nom complet"
              value={name}
              onChangeText={setName}
              mode="outlined"
              style={styles.input}
            />
            <TextInput
              label="PIN (4+ chiffres)"
              value={pin}
              onChangeText={setPin}
              mode="outlined"
              keyboardType="numeric"
              secureTextEntry
              style={styles.input}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Annuler</Button>
            <Button onPress={handleAdd}>Ajouter</Button>
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
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  input: {
    marginBottom: 12,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    opacity: 0.6,
  },
});

export default TeacherManagementScreen;
