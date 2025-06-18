export interface User {
  id: number;
  email: string;
  name: string;
  role: 'teacher' | 'student';
  created_at: string;
}

export interface Classroom {
  id: number;
  name: string;
  code: string;
  teacher_id: number;
  created_at: string;
}

export interface Note {
  id: number;
  title: string;
  content: string;
  background_type: 'math' | 'lined';
  classroom_id: number;
  user_id: number;
  is_teacher_original: boolean;
  original_note_id?: number;
  created_at: string;
  updated_at: string; // Added
  modified_by_student: boolean; // Added
}

export interface ClassroomMember {
  id: number;
  classroom_id: number;
  user_id: number;
  joined_at: string;
}

// NextAuth types extension
declare module "next-auth" {
  interface User {
    id: string;
    name: string;
    email: string;
    role: string;
  }

  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
  }
}