export interface User {
  id: number;
  name: string;
  role: 'teacher' | 'admin';
  pin_hash: string;
  created_at: string;
}

export interface School {
  id: number;
  name: string;
  created_at: string;
}

export interface Class {
  id: number;
  name: string;
  grade?: string;
  school_id?: number;
  teacher_id?: number;
  schedule?: string; // JSON string
  created_at: string;
}

export interface Student {
  id: number;
  student_code: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  thumbnail?: any; // BLOB
  active: number;
  created_at: string;
}

export interface Enrollment {
  id: number;
  student_id: number;
  class_id: number;
  enrolled_at: string;
}

export interface FaceEmbedding {
  id: number;
  student_id: number;
  embedding: any; // BLOB (Float32Array)
  quality?: number;
  created_at: string;
}

export interface AttendanceSession {
  id: number;
  class_id: number;
  teacher_id: number;
  date: string;
  start_time: string;
  end_time?: string;
  notes?: string;
  created_at: string;
}

export interface AttendanceRecord {
  id: number;
  session_id: number;
  student_id: number;
  status: 'present' | 'absent' | 'late' | 'excused';
  arrival_time?: string;
  method: 'face' | 'manual';
  confidence?: number;
  note?: string;
  created_at: string;
}
