import React, {useEffect, useState} from 'react';
import {View, StyleSheet, FlatList, Text} from 'react-native';
import {
  List,
  Searchbar,
  Button,
  ActivityIndicator,
  useTheme,
} from 'react-native-paper';
import {studentRepository} from '../../services/database/studentRepository';
import {Student} from '../../types/models';
import StudentThumbnail from '../../components/StudentThumbnail';

const StudentListScreen = ({navigation}: any) => {
  const theme = useTheme();
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadStudents();
    });
    return unsubscribe;
  }, [navigation]);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const data = await studentRepository.getAllActive();
      setStudents(data);
      setFilteredStudents(data);
    } catch (error) {
      console.error('[StudentList] Failed to load students:', error);
    } finally {
      setLoading(false);
    }
  };

  const onChangeSearch = (query: string) => {
    setSearchQuery(query);
    if (!query) {
      setFilteredStudents(students);
    } else {
      const filtered = students.filter(
        s =>
          s.first_name.toLowerCase().includes(query.toLowerCase()) ||
          s.last_name.toLowerCase().includes(query.toLowerCase()) ||
          s.student_code.toLowerCase().includes(query.toLowerCase()),
      );
      setFilteredStudents(filtered);
    }
  };

  const renderStudent = ({item}: {item: Student}) => (
    <List.Item
      title={`${item.first_name} ${item.last_name}`}
      titleStyle={{color: theme.colors.onSurface}}
      description={`Code: ${item.student_code}`}
      descriptionStyle={{color: theme.colors.onSurfaceVariant}}
      left={() => (
        <View style={styles.thumbnailContainer}>
          <StudentThumbnail thumbnail={item.thumbnail} size={48} />
        </View>
      )}
      onPress={() => {
        // Optionnel: Voir les détails ou modifier
      }}
    />
  );

  return (
    <View style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <View style={styles.topContainer}>
        <Searchbar
          placeholder="Rechercher des élèves..."
          onChangeText={onChangeSearch}
          value={searchQuery}
          style={styles.searchbar}
        />
        <Button
          mode="contained"
          icon="plus"
          onPress={() => navigation.navigate('StudentEnrollment')}
          style={styles.addButton}
          buttonColor={theme.colors.primary}
        >
          Nouvel Élève
        </Button>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <FlatList
          data={filteredStudents}
          keyExtractor={item => String(item.id)}
          renderItem={renderStudent}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text
                style={[
                  styles.emptyText,
                  {color: theme.colors.onSurfaceVariant},
                ]}>
                Aucun élève trouvé.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topContainer: {
    paddingBottom: 10,
    backgroundColor: 'transparent',
  },
  searchbar: {
    margin: 10,
    elevation: 2,
  },
  addButton: {
    marginHorizontal: 10,
    borderRadius: 8,
  },
  listContent: {
    paddingBottom: 120, // Increased to avoid floating navbar hiding the last items
  },
  thumbnailContainer: {
    justifyContent: 'center',
    paddingLeft: 10,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    fontSize: 16,
  },
});

export default StudentListScreen;

