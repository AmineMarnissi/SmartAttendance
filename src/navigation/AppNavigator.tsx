import React from 'react';
import {NavigationContainer, getFocusedRouteNameFromRoute} from '@react-navigation/native';
import {View, TouchableOpacity, Alert} from 'react-native';
import {classRepository} from '../services/database/classRepository';
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
  SettingsStackParamList,
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
import ClassManagementScreen from '../screens/settings/ClassManagementScreen';
import TeacherManagementScreen from '../screens/settings/TeacherManagementScreen';
import SchoolSettingsScreen from '../screens/settings/SchoolSettingsScreen';

const TeacherTab = createBottomTabNavigator<TeacherTabParamList>();
const TeacherStack = createStackNavigator<AttendanceStackParamList>();
const AdminStack = createStackNavigator<AdminStackParamList>();
const RootStack = createStackNavigator<RootStackParamList>();
const HistoryStack = createStackNavigator<HistoryStackParamList>();
const SettingsStack = createStackNavigator<SettingsStackParamList>();

const tabIcons: Record<keyof TeacherTabParamList, string> = {
  TeacherHome: 'clipboard-check-outline',
  Classes: 'account-group-outline',
  History: 'history',
  Settings: 'cog-outline',
  QuickScan: 'camera-outline',
};

const commonHeaderOptions = {
  headerStyle: {
    backgroundColor: '#0F2027',
    elevation: 0,
    shadowOpacity: 0,
  },
  headerTintColor: '#fff',
  headerTitleStyle: {
    fontWeight: '800' as const,
    fontSize: 18,
    letterSpacing: 0.5,
  },
  headerTitleAlign: 'center' as const,
};

const HistoryNavigator = () => (
  <HistoryStack.Navigator screenOptions={commonHeaderOptions}>
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
  <AdminStack.Navigator screenOptions={commonHeaderOptions}>
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

const SettingsNavigator = () => (
  <SettingsStack.Navigator screenOptions={commonHeaderOptions}>
    <SettingsStack.Screen
      name="SettingsHome"
      component={SettingsScreen}
      options={{title: 'Paramètres'}}
    />
    <SettingsStack.Screen
      name="ClassManagement"
      component={ClassManagementScreen}
      options={{title: 'Gestion des Classes'}}
    />
    <SettingsStack.Screen
      name="TeacherManagement"
      component={TeacherManagementScreen}
      options={{title: 'Gestion des Enseignants'}}
    />
    <SettingsStack.Screen
      name="SchoolSettings"
      component={SchoolSettingsScreen}
      options={{title: 'Paramètres de l\'école'}}
    />
  </SettingsStack.Navigator>
);

const AttendanceStack = () => (
  <TeacherStack.Navigator screenOptions={commonHeaderOptions}>
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

const MainTabs = () => {
  const isDarkMode = useThemeStore((state) => state.isDarkMode);
  const currentTheme = isDarkMode ? darkTheme : lightTheme;

  const getTabBarStyle = (route: any, defaultRoute: string, hiddenRoutes: string[] = []) => {
    const routeName = getFocusedRouteNameFromRoute(route) ?? defaultRoute;
    const baseStyle = {
      position: 'absolute' as const,
      bottom: 20,
      left: 20,
      right: 20,
      elevation: 5,
      backgroundColor: currentTheme.colors.surface,
      borderRadius: 35,
      height: 60,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.25,
      shadowRadius: 10,
      borderTopWidth: 0,
      paddingBottom: 0,
    };
    
    if (hiddenRoutes.includes(routeName)) {
      return { ...baseStyle, display: 'none' as const };
    }
    return baseStyle;
  };

  return (
    <TeacherTab.Navigator
      screenOptions={{
        tabBarShowLabel: false,
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: isDarkMode ? '#666666' : '#A0A0A0',
        tabBarStyle: {
          position: 'absolute',
          bottom: 20,
          left: 20,
          right: 20,
          elevation: 5,
          backgroundColor: currentTheme.colors.surface,
          borderRadius: 35,
          height: 60,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.25,
          shadowRadius: 10,
          borderTopWidth: 0,
          paddingBottom: 0,
        },
      }}>
      <TeacherTab.Screen
        name="TeacherHome"
        component={AttendanceStack}
        options={({route}) => ({
          title: 'Présence',
          headerShown: false,
          tabBarStyle: getTabBarStyle(route, 'Home', [
            'Home',
            'Scan',
            'ScanReview',
          ]),
          tabBarIcon: ({focused, color}) => (
            <View
              style={{
                backgroundColor: focused ? currentTheme.colors.primary : 'transparent',
                borderRadius: 22,
                width: 44,
                height: 44,
                justifyContent: 'center',
                alignItems: 'center',
              }}>
              <MaterialCommunityIcons
                name={tabIcons.TeacherHome}
                color={color}
                size={24}
              />
            </View>
          ),
        })}
      />
      <TeacherTab.Screen
        name="Classes"
        component={AdminNavigator}
        options={({route}) => ({
          title: 'Étudiants',
          headerShown: false,
          tabBarStyle: getTabBarStyle(route, 'AdminDashboard', [
            'StudentEnrollment',
            'FaceCapture',
          ]),
          tabBarIcon: ({focused, color}) => (
            <View
              style={{
                backgroundColor: focused ? currentTheme.colors.primary : 'transparent',
                borderRadius: 22,
                width: 44,
                height: 44,
                justifyContent: 'center',
                alignItems: 'center',
              }}>
              <MaterialCommunityIcons
                name={tabIcons.Classes}
                color={color}
                size={24}
              />
            </View>
          ),
        })}
      />

      <TeacherTab.Screen
        name="QuickScan"
        component={View} // Placeholder
        options={({navigation}) => ({
          tabBarButton: (props) => (
            <TouchableOpacity
              {...props}
              activeOpacity={0.8}
              onPress={async () => {
                try {
                  const classes = await classRepository.getAll();
                  if (classes.length > 0) {
                    // Try to find a class with students, otherwise take the first one
                    navigation.navigate('TeacherHome', {
                      screen: 'Scan',
                      params: { classId: classes[0].id }
                    });
                  } else {
                    Alert.alert('Info', 'Veuillez d\'abord créer une classe.');
                  }
                } catch (error) {
                  console.error('QuickScan failed:', error);
                }
              }}
              style={{
                top: -20,
                justifyContent: 'center',
                alignItems: 'center',
              }}>
              <View
                style={{
                  width: 65,
                  height: 65,
                  borderRadius: 35,
                  backgroundColor: currentTheme.colors.primary,
                  justifyContent: 'center',
                  alignItems: 'center',
                  elevation: 8,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 5,
                  borderWidth: 4,
                  borderColor: currentTheme.colors.surface,
                }}>
                <MaterialCommunityIcons name="camera-iris" color="#fff" size={32} />
              </View>
            </TouchableOpacity>
          ),
        })}
      />

      <TeacherTab.Screen
        name="History"
        component={HistoryNavigator}
        options={{
          title: 'Historique',
          headerShown: false,
          tabBarIcon: ({focused, color}) => (
            <View
              style={{
                backgroundColor: focused ? currentTheme.colors.primary : 'transparent',
                borderRadius: 22,
                width: 44,
                height: 44,
                justifyContent: 'center',
                alignItems: 'center',
              }}>
              <MaterialCommunityIcons
                name={tabIcons.History}
                color={color}
                size={24}
              />
            </View>
          ),
        }}
      />
      <TeacherTab.Screen 
        name="Settings" 
        component={SettingsNavigator} 
        options={({route}) => ({
          title: 'Paramètres',
          headerShown: false,
          tabBarStyle: getTabBarStyle(route, 'SettingsHome', [
            'ClassManagement',
            'TeacherManagement',
            'SchoolSettings',
          ]),
          tabBarIcon: ({focused, color}) => (
            <View
              style={{
                backgroundColor: focused ? currentTheme.colors.primary : 'transparent',
                borderRadius: 22,
                width: 44,
                height: 44,
                justifyContent: 'center',
                alignItems: 'center',
              }}>
              <MaterialCommunityIcons
                name={tabIcons.Settings}
                color={color}
                size={24}
              />
            </View>
          ),
        })} 
      />
    </TeacherTab.Navigator>
  );
};

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
