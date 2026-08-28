import { Timestamp, FieldValue } from "firebase/firestore";

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  role: string;
  kanwil: string;
  createdAt: Timestamp | FieldValue | number | Date | null;
  resetRequested?: boolean;
  resetRequestedAt?: Timestamp | FieldValue | number | Date | null;
}

export interface UserSession {
  uid: string;
  email: string | null;
  displayName: string | null;
  isAdmin: boolean;
  profile?: UserProfile | null;
}

export interface RegisterUserInput {
  displayName: string;
  email: string;
  password: string;
  kanwil: string;
  role?: string;
}


