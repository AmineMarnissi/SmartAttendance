import React, {useEffect, useState} from 'react';
import {View, StyleSheet, ScrollView, Text} from 'react-native';
import {Card, Button, List, useTheme} from 'react-native-paper';
import {useAuthStore} from '../../store/useAuthStore';
import {studentRepository} from '../../services/database/studentRepository';
import {db} from '../../services/database/db';
import StatCard from '../../components/analytics/StatCard';

const AdminDashboardScreen = ({navigation}: any) => {
  const theme = useTheme();
  useAuthStore(state => state.user);
  const [stats, setStats] = useState({enrolled: 0, withFace: 0, total: 0});

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Count total active students
      const allStudents = await studentRepository.getAllActive();
      // Count students with face embeddings
      const embedResult = await db.execute(
        'SELECT COUNT(DISTINCT student_id) as cnt FROM face_embeddings;',
      );
      const withFace = (embedResult.rows[0] as any)?.cnt ?? 0;
      console.log(
        '[AdminDashboard] Students:',
        allStudents.length,
        'With face:',
        withFace,
      );
      setStats({
        enrolled: allStudents.length,
        withFace,
        total: allStudents.length,
      });
    } catch (e) {
      console.error('[AdminDashboard] Failed to load stats:', e);
    }
  };

  return (
    <ScrollView
      style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <View style={styles.header}>
        <Text style={[styles.pageTitle, {color: theme.colors.onSurface}]}>
          Students & Reports
        </Text>
      </View>

      <View style={styles.statGrid}>
        <StatCard
          title="Enrolled Students"
          value={stats.enrolled}
          color="#4CAF50"
        />
        <StatCard
          title="Face Enrolled"
          value={stats.withFace}
          color="#FF9800"
        />
      </View>

      <Card
        style={[
          styles.card,
          {backgroundColor: theme.colors.elevation.level2},
        ]}>
        <Card.Content>
          <Text style={[styles.sectionTitle, {color: theme.colors.onSurface}]}>
            Quick Actions
          </Text>
          <View style={styles.actionGrid}>
            <Button
              mode="contained"
              onPress={() => navigation.navigate('StudentList')}
              style={styles.actionBtn}>
              View Students
            </Button>
            <Button
              mode="contained-tonal"
              onPress={() => navigation.navigate('StudentEnrollment')}
              style={styles.actionBtn}>
              Enroll New
            </Button>
          </View>
          <View style={styles.actionGridSecondary}>
            <Button
              mode="outlined"
              onPress={() => navigation.navigate('Reports')}
              style={styles.actionBtn}>
              Reports
            </Button>
          </View>
        </Card.Content>
      </Card>

      <List.Section>
        <Text style={[styles.sectionTitle, {color: theme.colors.onSurface}]}>
          Management
        </Text>
        <List.Item
          title="Manage Classes"
          titleStyle={{color: theme.colors.onSurface}}
          left={props => <List.Icon {...props} icon="google-classroom" />}
          onPress={() => {}}
        />
        <List.Item
          title="Manage Teachers"
          titleStyle={{color: theme.colors.onSurface}}
          left={props => <List.Icon {...props} icon="account-group" />}
          onPress={() => {}}
        />
        <List.Item
          title="School Settings"
          titleStyle={{color: theme.colors.onSurface}}
          left={props => <List.Icon {...props} icon="cog" />}
          onPress={() => {}}
        />
      </List.Section>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  statGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  card: {
    marginBottom: 20,
  },
  actionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  actionGridSecondary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  actionBtn: {
    flex: 1,
    marginHorizontal: 5,
  },
});

export default AdminDashboardScreen;
