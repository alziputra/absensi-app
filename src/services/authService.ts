import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import {
  User,
  signOut,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
} from "firebase/auth";
import { db, auth } from "@/config/firebase";
import { DB_COLLECTIONS } from "@/config/constants";
import { UserProfile, RegisterUserInput } from "@/types";

/**
 * Mendaftarkan akun baru ke Firebase Auth dan menyimpan profil di `absensi-app/{uid}`
 */
export const registerNewUser = async (
  input: RegisterUserInput
): Promise<UserProfile> => {
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    input.email,
    input.password
  );
  const user = userCredential.user;

  // Update display name di Firebase Auth
  await updateProfile(user, {
    displayName: input.displayName,
  });

  // Simpan data profil ke root collection Firestore (Default role: "user")
  const newProfile: UserProfile = {
    uid: user.uid,
    displayName: input.displayName,
    email: input.email,
    role: input.role || "user",
    kanwil: input.kanwil || "Kanwil XII - Surabaya",
    createdAt: serverTimestamp(),
  };

  const userDocRef = doc(db, DB_COLLECTIONS.ROOT_USERS, user.uid);
  await setDoc(userDocRef, newProfile);

  return newProfile;
};

/**
 * Mengirim email reset password langsung
 */
export const sendResetPasswordEmail = async (email: string): Promise<void> => {
  await sendPasswordResetEmail(auth, email);
};

/**
 * User mengajukan permohonan reset password (menyimpan status di absensi-app/{uid})
 */
export const requestPasswordResetByEmail = async (email: string): Promise<UserProfile> => {
  const { collection, query, where, getDocs, updateDoc } = await import("firebase/firestore");
  const usersRef = collection(db, DB_COLLECTIONS.ROOT_USERS);
  const q = query(usersRef, where("email", "==", email.trim()));
  const snap = await getDocs(q);

  if (snap.empty) {
    throw new Error("Email tidak terdaftar dalam sistem.");
  }

  const userDoc = snap.docs[0];
  await updateDoc(userDoc.ref, {
    resetRequested: true,
    resetRequestedAt: serverTimestamp(),
  });

  return userDoc.data() as UserProfile;
};

/**
 * Admin menyetujui dan mengirimkan link reset password ke email user
 */
export const approveAndSendPasswordReset = async (
  uid: string,
  email: string
): Promise<void> => {
  const { doc, updateDoc } = await import("firebase/firestore");
  
  // 1. Kirim link reset password via Firebase Auth
  await sendPasswordResetEmail(auth, email.trim());

  // 2. Clear status permintaan di Firestore
  const userDocRef = doc(db, DB_COLLECTIONS.ROOT_USERS, uid);
  await updateDoc(userDocRef, {
    resetRequested: false,
  });
};

/**
 * Sinkronisasi data profil pengguna di root collection `absensi-app/{uid}`
 */
export const syncUserProfile = async (
  user: User,
  customData?: Partial<UserProfile>
): Promise<UserProfile> => {
  const userDocRef = doc(db, DB_COLLECTIONS.ROOT_USERS, user.uid);
  const userSnap = await getDoc(userDocRef);

  if (userSnap.exists()) {
    const existing = userSnap.data() as UserProfile;
    if (customData && Object.keys(customData).length > 0) {
      await setDoc(userDocRef, customData, { merge: true });
      return { ...existing, ...customData };
    }
    return existing;
  }

  // Generate nama default dari email jika displayName kosong
  const fallbackName = user.email
    ? user.email.split("@")[0].charAt(0).toUpperCase() +
      user.email.split("@")[0].slice(1)
    : "Karyawan";

  const newProfile: UserProfile = {
    uid: user.uid,
    displayName: user.displayName || customData?.displayName || fallbackName,
    email: user.email || "",
    role: customData?.role || "user",
    kanwil: customData?.kanwil || "Kanwil XII - Surabaya",
    createdAt: serverTimestamp(),
  };

  await setDoc(userDocRef, newProfile);
  return newProfile;
};

/**
 * Mengubah role pengguna di Firestore (`absensi-app/{uid}`) -> "admin" atau "user"
 */
export const updateUserRole = async (
  uid: string,
  newRole: "admin" | "user" | string
): Promise<void> => {
  const { doc, updateDoc } = await import("firebase/firestore");
  const userDocRef = doc(db, DB_COLLECTIONS.ROOT_USERS, uid);
  await updateDoc(userDocRef, {
    role: newRole,
  });
};

/**
 * Mengambil profil user berdasarkan UID
 */
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const userDocRef = doc(db, DB_COLLECTIONS.ROOT_USERS, uid);
  const snap = await getDoc(userDocRef);
  if (snap.exists()) {
    return snap.data() as UserProfile;
  }
  return null;
};

/**
 * Mengambil seluruh profil user dari root collection `absensi-app`
 */
export const getAllUserProfiles = async (): Promise<UserProfile[]> => {
  const { collection, getDocs } = await import("firebase/firestore");
  const usersRef = collection(db, DB_COLLECTIONS.ROOT_USERS);
  const snap = await getDocs(usersRef);
  return snap.docs.map((d) => d.data() as UserProfile);
};

/**
 * Logout pengguna
 */
export const logoutUser = async (): Promise<void> => {
  await signOut(auth);
};
