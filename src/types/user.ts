import { Timestamp, FieldValue } from "firebase/firestore";

export interface UserProfile {
  uid: string;
  nik?: string;
  displayName: string;
  email: string;
  password?: string;
  role: string;
  kanwil: string;
  jabatan?: string;
  passwordSet?: boolean;
  activatedAt?: Timestamp | FieldValue | number | Date | null;
  createdAt: Timestamp | FieldValue | number | Date | null;
  updatedAt?: Timestamp | FieldValue | number | Date | null;
  resetRequested?: boolean;
  resetRequestedAt?: Timestamp | FieldValue | number | Date | null;
}

export interface UserSession {
  uid: string;
  nik?: string;
  email: string | null;
  displayName: string | null;
  isAdmin: boolean;
  profile?: UserProfile | null;
}

export interface RegisterUserInput {
  nik?: string;
  displayName: string;
  email: string;
  password: string;
  kanwil: string;
  role?: string;
  jabatan?: string;
}

export interface AdminCreateUserInput {
  nik: string;
  displayName: string;
  email: string;
  kanwil: string;
  role?: string;
  jabatan?: string;
  password?: string;
}


