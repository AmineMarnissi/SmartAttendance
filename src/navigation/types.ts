export type AuthStackParamList = {
  Login: undefined;
  PinSetup: undefined;
};

export type SettingsStackParamList = {
  SettingsHome: undefined;
  ClassManagement: undefined;
  TeacherManagement: undefined;
  SchoolSettings: undefined;
};

export type TeacherTabParamList = {
  TeacherHome: undefined;
  Classes: undefined;
  History: undefined;
  Settings: undefined;
};

export type AdminStackParamList = {
  AdminDashboard: undefined;
  Reports: undefined;
  StudentList: undefined;
  StudentEnrollment: undefined;
  FaceCapture: undefined;
};

export type AttendanceStackParamList = {
  Home: undefined;
  Scan: undefined;
  ScanReview: {
    sessionId: string;
    attendanceRecords: any[];
  };
};

export type HistoryStackParamList = {
  HistoryList: undefined;
  SessionDetail: {
    sessionId: string;
  };
};

export type RootStackParamList = {
  Main: undefined;
};
