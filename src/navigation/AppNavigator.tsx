import React from 'react';
import {NavigationContainer, getFocusedRouteNameFromRoute} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {darkTheme, lightTheme} from '../theme/theme';
import {useThemeStore} from '../store/useThemeStore';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  TeacherTabParamList,
  AdminStackParamList,
  AttendanceStackParamList,
  HistoryStackParamList,
  RootStackParamList,
} from './types';

import HomeScreen from '../screens/teacher/HomeScreen';
import ScanScreen from '../screens/teacher/ScanScreen';
import ScanReviewScreen from '../screens/teacher/ScanReviewScreen';
import AttendanceHistoryScreen from '../screens/teacher/AttendanceHistoryScreen';
import SessionDetailScreen from '../screens/teacher/SessionDetailScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import StudentListScreen from '../screens/admin/StudentListScreen';
import ReportsScreen from '../screens/admin/ReportsScreen';
import StudentEnrollmentScreen from '../screens/enrollment/StudentEnrollmentScreen';
import FaceCaptureScreen from '../screens/enrollment/FaceCaptureScreen';

const TeacherTab = createBottomTabNavigator<TeacherTabParamList>();
const TeacherStack = createStackNavigator<AttendanceStackParamList>();
const AdminStack = createStackNavigator<AdminStackParamList>();
const RootStack = createStackNavigator<RootStackParamList>();
const HistoryStack = createStackNavigator<HistoryStackParamList>();

const tabIcons: Record<keyof TeacherTabParamList, string> = {
  TeacherHome: 'clipboard-check-outline',
  Classes: 'account-group-outline',
  History: 'history',
  Settings: 'cog-outline',
};

const HistoryNavigator = () => (
  <HistoryStack.Navigator>
    <HistoryStack.Screen
      name="HistoryList"
      component={AttendanceHistoryScreen}
      options={{title: 'Historique de présence'}}
    />
    <HistoryStack.Screen
      name="SessionDetail"
      component={SessionDetailScreen}
      options={{title: 'Détails de la session'}}
    />
  </HistoryStack.Navigator>
);

const AdminNavigator = () => (
  <AdminStack.Navigator>
    <AdminStack.Screen
      name="AdminDashboard"
      component={AdminDashboardScreen}
      options={{title: 'Tableau de bord'}}
    />
    <AdminStack.Screen
      name="StudentList"
      component={StudentListScreen}
      options={{title: 'Élèves'}}
    />
    <AdminStack.Screen
      name="StudentEnrollment"
      component={StudentEnrollmentScreen}
      options={{title: 'Inscrire un élève'}}
    />
    <AdminStack.Screen
      name="FaceCapture"
      component={FaceCaptureScreen}
      options={{headerShown: false}}
    />
    <AdminStack.Screen name="Reports" component={ReportsScreen} options={{title: 'Rapports'}} />
  </AdminStack.Navigator>
);

const AttendanceStack = () => (
  <TeacherStack.Navigator>
    <TeacherStack.Screen
      name="Home"
      component={HomeScreen}
      options={{headerShown: false}}
    />
    <TeacherStack.Screen
      name="Scan"
      component={ScanScreen}
      options={{headerShown: false}}
    />
    <TeacherStack.Screen
      name="ScanReview"
      component={ScanReviewScreen}
      options={{title: 'Vérification de Présence'}}
    />
  </TeacherStack.Navigator>
);

const MainTabs = () => (
  <TeacherTab.Navigator
    screenOptions={({route}) => ({
      tabBarIcon: ({color, size}) => (
        <MaterialCommunityIcons
          name={tabIcons[route.name]}
          color={color}
          size={size}
        />
      ),
    })}>
    <TeacherTab.Screen
      name="TeacherHome"
      component={AttendanceStack}
      options={({route}) => {
        const routeName = getFocusedRouteNameFromRoute(route) ?? 'Home';
        return {
          title: 'Présence',
          headerShown: false,
          tabBarStyle: routeName === 'Home' ? {display: 'none'} : undefined,
        };
      }}
    />
    <TeacherTab.Screen
      name="Classes"
      component={AdminNavigator}
      options={{title: 'Étudiants', headerShown: false}}
    />
    <TeacherTab.Screen
      name="History"
      component={HistoryNavigator}
      options={{title: 'Historique', headerShown: false}}
    />
    <TeacherTab.Screen name="Settings" component={SettingsScreen} options={{title: 'Paramètres'}} />
  </TeacherTab.Navigator>
);

const AppNavigator = () => {
  const isDarkMode = useThemeStore((state) => state.isDarkMode);
  const currentTheme = isDarkMode ? darkTheme : lightTheme;

  return (
    <NavigationContainer theme={currentTheme}>
      <RootStack.Navigator screenOptions={{headerShown: false}}>
        <RootStack.Screen name="Main" component={MainTabs} />
      </RootStack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
