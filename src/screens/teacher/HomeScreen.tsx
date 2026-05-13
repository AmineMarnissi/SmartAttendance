import React, {useState, useEffect} from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import {Avatar, Button, Card, useTheme} from 'react-native-paper';
import {classRepository} from '../../services/database/classRepository';
import {Class} from '../../types/models';
import {attendanceRepository} from '../../services/database/attendanceRepository';
import AttendanceChart from '../../components/analytics/AttendanceChart';
import {usePreferencesStore} from '../../store/usePreferencesStore';
import {brand, shadow} from '../../theme/design';

const HomeScreen = ({navigation}: any) => {
  const theme = useTheme();
  const t = usePreferencesStore(state => state.t);
  const [classes, setClasses] = useState<Class[]>([]);
  const [overallRate, setOverallRate] = useState(0);
  const [trendData, setTrendData] = useState<{date: string; rate: number}[]>(
    [],
  );

  useEffect(() => {
    const loadData = async () => {
      const allClasses = await classRepository.getAll();
      setClasses(allClasses);
      if (allClasses.length > 0) {
        setTrendData(
          await attendanceRepository.getDailyAttendanceTrend(allClasses[0].id),
        );
      }
      let totalPresent = 0;
      let totalRecords = 0;
      for (const cls of allClasses) {
        const stats = await attendanceRepository.getClassAttendanceStats(
          cls.id,
        );
        stats.forEach((s: any) => {
          if (s.status === 'present' || s.status === 'late') {
            totalPresent += s.count;
          }
          totalRecords += s.count;
        });
      }
      setOverallRate(
        totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 0,
      );
    };
    loadData();
  }, []);

  return (
    <ScrollView
      style={[styles.container, {backgroundColor: theme.colors.background}]}
      contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.heroKicker}>{t('teacherDashboard')}</Text>
        <Text style={styles.heroTitle}>Live attendance, made simple.</Text>
        <View style={styles.heroStats}>
          <View>
            <Text style={styles.heroValue}>{overallRate}%</Text>
            <Text style={styles.heroLabel}>{t('attendanceRate')}</Text>
          </View>
          <View>
            <Text style={styles.heroValue}>{classes.length}</Text>
            <Text style={styles.heroLabel}>{t('classes')}</Text>
          </View>
        </View>
      </View>

      {trendData.length > 0 && (
        <AttendanceChart data={trendData} title="Attendance trend" />
      )}

      <Text style={[styles.sectionTitle, {color: theme.colors.onSurface}]}>
        {t('classes')}
      </Text>
      {classes.map(cls => (
        <Card key={cls.id} style={styles.classCard}>
          <Card.Content style={styles.classRow}>
            <Avatar.Icon
              icon="google-classroom"
              size={52}
              style={styles.classIcon}
            />
            <View style={styles.classInfo}>
              <Text style={styles.className}>{cls.name}</Text>
              <Text style={styles.classMeta}>
                {cls.grade ? `${t('grade')} ${cls.grade}` : 'No grade'}
              </Text>
            </View>
            <Button
              mode="contained"
              onPress={() => navigation.navigate('Scan', {classId: cls.id})}
              style={styles.scanButton}>
              {t('scan')}
            </Button>
          </Card.Content>
        </Card>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  content: {padding: 16, paddingBottom: 32},
  hero: {
    backgroundColor: brand.primary,
    borderRadius: 34,
    padding: 24,
    marginBottom: 18,
    ...shadow.card,
  },
  heroKicker: {color: '#FFE5E7', fontWeight: '900'},
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 31,
    lineHeight: 35,
    fontWeight: '900',
    marginTop: 8,
    letterSpacing: -0.8,
  },
  heroStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 24,
    marginTop: 22,
    padding: 16,
  },
  heroValue: {color: '#FFFFFF', fontSize: 26, fontWeight: '900'},
  heroLabel: {color: '#FFE5E7', fontWeight: '700'},
  sectionTitle: {fontSize: 22, fontWeight: '900', marginVertical: 12},
  classCard: {marginBottom: 12, borderRadius: 26, ...shadow.card},
  classRow: {flexDirection: 'row', alignItems: 'center'},
  classIcon: {backgroundColor: brand.primarySoft},
  classInfo: {flex: 1, marginLeft: 14},
  className: {fontWeight: '900', fontSize: 17, color: brand.ink},
  classMeta: {color: brand.muted, marginTop: 4},
  scanButton: {borderRadius: 16},
});

export default HomeScreen;
