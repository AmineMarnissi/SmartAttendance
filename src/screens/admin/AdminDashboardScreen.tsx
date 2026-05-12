import React, {useEffect, useState} from 'react';
import {View, StyleSheet, ScrollView, Text} from 'react-native';
import {Card, Button, useTheme, Searchbar, List, Avatar, ProgressBar} from 'react-native-paper';
import {useAuthStore} from '../../store/useAuthStore';
import {studentRepository} from '../../services/database/studentRepository';
import {db, getRows} from '../../services/database/db';
import StatCard from '../../components/analytics/StatCard';

const AdminDashboardScreen = ({navigation}: any) => {
  const theme = useTheme();
  useAuthStore(state => state.user);
  const [stats, setStats] = useState({enrolled: 0, withFace: 0, attendance: 0});
  const [searchQuery, setSearchQuery] = useState('');
  const [missingPhotos, setMissingPhotos] = useState<any[]>([]);

  useEffect(() => {
    loadStats();
    loadMissingPhotos();
  }, []);

  const loadStats = async () => {
    try {
      const allStudents = await studentRepository.getAllActive();
      const embedResult = await db.execute(
        'SELECT COUNT(DISTINCT student_id) as cnt FROM face_embeddings;',
      );
      const withFace = (embedResult.rows[0] as any)?.cnt ?? 0;
      const attendanceRate = 85; 

      setStats({
        enrolled: allStudents.length,
        withFace,
        attendance: attendanceRate,
      });
    } catch (e) {
      console.error('[AdminDashboard] Failed to load stats:', e);
    }
  };

  const loadMissingPhotos = async () => {
    try {
      const result = await db.execute(`
        SELECT * FROM students 
        WHERE id NOT IN (SELECT DISTINCT student_id FROM face_embeddings)
        AND active = 1
        LIMIT 3;
      `);
      setMissingPhotos(getRows(result));
    } catch (e) {
      console.error('[AdminDashboard] Missing photos error:', e);
    }
  };

  return (
    <ScrollView
      style={[styles.container, {backgroundColor: theme.colors.background}]}>
      
      <Searchbar
        placeholder="Rechercher un élève..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchbar}
        onIconPress={() => navigation.navigate('StudentList')}
      />

      <View style={styles.header}>
        <Text style={[styles.pageTitle, {color: theme.colors.onSurface}]}>
          Tableau de Bord
        </Text>
      </View>

      <View style={styles.statGrid}>
        <StatCard
          title="Inscrits"
          value={stats.enrolled}
          color="#4CAF50"
        />
        <StatCard
          title="IA Active"
          value={stats.withFace}
          color="#FF9800"
        />
      </View>

      <View style={styles.dashboardGrid}>
        <Card style={styles.chartCard}>
          <Card.Content>
            <Text style={styles.smallTitle}>Présence Jour</Text>
            <View style={styles.progressContainer}>
              <View style={styles.circularPlaceholder}>
                <Text style={styles.chartValue}>{stats.attendance}%</Text>
              </View>
              <ProgressBar 
                progress={stats.attendance / 100} 
                color="#4CAF50" 
                style={styles.miniProgress} 
              />
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.alertCard}>
          <Card.Content>
            <Text style={styles.smallTitle}>⚠️ Sans Photo (IA)</Text>
            {missingPhotos.length === 0 ? (
              <Text style={styles.emptyText}>Tout est OK !</Text>
            ) : (
              missingPhotos.map((s, i) => (
                <List.Item
                  key={i}
                  title={`${s.first_name}`}
                  titleStyle={{fontSize: 11}}
                  left={props => <Avatar.Text {...props} label={s.first_name[0]} size={20} />}
                  onPress={() => navigation.navigate('FaceCapture', { 
                    studentData: { 
                      firstName: s.first_name, 
                      lastName: s.last_name, 
                      studentCode: s.student_code,
                      classId: 1
                    } 
                  })}
                />
              ))
            )}
          </Card.Content>
        </Card>
      </View>

      <Card
        style={[
          styles.card,
          {backgroundColor: theme.colors.elevation.level2, marginTop: 10},
        ]}>
        <Card.Content>
          <Text style={[styles.sectionTitle, {color: theme.colors.onSurface}]}>
            Actions Rapides
          </Text>
          <View style={styles.actionGrid}>
            <Button
              mode="contained"
              onPress={() => navigation.navigate('StudentList')}
              style={styles.actionBtn}>
              Liste
            </Button>
            <Button
              mode="contained-tonal"
              onPress={() => navigation.navigate('StudentEnrollment')}
              style={styles.actionBtn}>
              Nouveau
            </Button>
            <Button
              mode="outlined"
              onPress={() => navigation.navigate('Reports')}
              style={styles.actionBtn}>
              Rapports
            </Button>
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },
  searchbar: {
    marginBottom: 15,
    elevation: 2,
    borderRadius: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  statGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  dashboardGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  chartCard: {
    flex: 1,
    justifyContent: 'center',
  },
  alertCard: {
    flex: 1.2,
  },
  progressContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  circularPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 4,
    borderColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  miniProgress: {
    height: 4,
    borderRadius: 2,
    width: '100%',
  },
  chartValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  smallTitle: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    color: '#666',
  },
  card: {
    marginBottom: 10,
  },
  actionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: 5,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  actionBtn: {
    flex: 1,
  },
  emptyText: {
    fontSize: 11,
    color: '#888',
    textAlign: 'center',
    marginTop: 20,
  }
});

export default AdminDashboardScreen;
