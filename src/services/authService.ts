import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/config/firebase";
import { DB_COLLECTIONS } from "@/config/constants";
import { UserProfile, RegisterUserInput, AdminCreateUserInput } from "@/types";

export const AUTH_STORAGE_KEY = "pegadaian_session_user";

// Flag untuk mencegah proses async (seperti syncUserProfile) membangkitkan sesi kembali setelah logout
let isLogoutInProgress = false;

export const setLogoutInProgress = (val: boolean): void => {
  isLogoutInProgress = val;
};

/**
 * Menyimpan sesi login pengguna ke localStorage
 */
export const saveSession = (profile: UserProfile): void => {
  if (typeof window !== "undefined") {
    // Jika sedang dalam proses logout atau sesi kosong, jangan simpan
    if (isLogoutInProgress) return;
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(profile));
    window.dispatchEvent(new Event("pegadaian_auth_changed"));
  }
};

/**
 * Mengambil sesi login pengguna dari localStorage
 */
export const getStoredSession = (): UserProfile | null => {
  if (typeof window === "undefined") return null;
  if (isLogoutInProgress) return null;
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as UserProfile) : null;
  } catch {
    return null;
  }
};

/**
 * Logout pengguna: bersihkan sesi dari localStorage secara permanen
 */
export const logoutUser = async (): Promise<void> => {
  if (typeof window !== "undefined") {
    isLogoutInProgress = true;
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      sessionStorage.clear();
    } catch (err) {
      console.error("Gagal membersihkan storage saat logout:", err);
    }
    window.dispatchEvent(new Event("pegadaian_auth_changed"));
  }
};

/**
 * Super Admin Menambahkan Data Karyawan Baru ke Firestore
 * Path: `absensi-app/users data/karyawan/{NIK}`
 */
export const adminCreateUser = async (
  input: AdminCreateUserInput
): Promise<UserProfile> => {
  const cleanNik = input.nik.trim();
  const cleanEmail = input.email.trim().toLowerCase();

  if (!cleanNik) {
    throw new Error("NIK karyawan wajib diisi.");
  }
  if (!cleanEmail) {
    throw new Error("Email karyawan wajib diisi.");
  }

  // 1. Cek apakah NIK sudah terdaftar
  const userDocRef = doc(
    db,
    DB_COLLECTIONS.ROOT,
    DB_COLLECTIONS.USERS_DOC,
    DB_COLLECTIONS.USERS_SUB,
    cleanNik
  );
  const existingDoc = await getDoc(userDocRef);
  if (existingDoc.exists()) {
    throw new Error(`NIK ${cleanNik} sudah terdaftar dalam sistem.`);
  }

  // 2. Cek apakah Email sudah digunakan oleh karyawan lain
  const usersCollRef = collection(
    db,
    DB_COLLECTIONS.ROOT,
    DB_COLLECTIONS.USERS_DOC,
    DB_COLLECTIONS.USERS_SUB
  );
  const emailQuery = query(usersCollRef, where("email", "==", cleanEmail));
  const emailSnap = await getDocs(emailQuery);
  if (!emailSnap.empty) {
    throw new Error(`Email ${cleanEmail} sudah digunakan oleh karyawan lain.`);
  }

  // 3. Simpan data user langsung di Firestore
  const newProfile: UserProfile = {
    uid: cleanNik,
    nik: cleanNik,
    displayName: input.displayName.trim(),
    email: cleanEmail,
    password: input.password ? input.password.trim() : "",
    role: input.role || "user",
    kanwil: input.kanwil || "Kanwil XII - Surabaya",
    jabatan: input.jabatan || "MS KANWIL",
    passwordSet: Boolean(input.password && input.password.trim().length >= 6),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(userDocRef, newProfile);
  return newProfile;
};

/**
 * Mengecek status keberadaan NIK di Firestore
 */
export const checkNikStatus = async (
  nik: string
): Promise<{ exists: boolean; profile?: UserProfile | null }> => {
  const cleanNik = nik.trim();
  if (!cleanNik) return { exists: false, profile: null };

  const userDocRef = doc(
    db,
    DB_COLLECTIONS.ROOT,
    DB_COLLECTIONS.USERS_DOC,
    DB_COLLECTIONS.USERS_SUB,
    cleanNik
  );
  const snap = await getDoc(userDocRef);

  if (snap.exists()) {
    const data = snap.data() as UserProfile;
    return {
      exists: true,
      profile: {
        ...data,
        nik: cleanNik,
      },
    };
  }

  return { exists: false, profile: null };
};

/**
 * Aktivasi Akun Karyawan Baru:
 * Karyawan membuat password baru pertama kali dan disimpan langsung ke Firestore.
 * NIK yang sudah aktif (passwordSet: true) tidak bisa aktivasi ulang.
 */
export const activateUserWithPassword = async (
  nik: string,
  password: string
): Promise<UserProfile> => {
  const cleanNik = nik.trim();
  const cleanPass = password.trim();

  if (!cleanNik) throw new Error("NIK tidak boleh kosong.");
  if (cleanPass.length < 6) {
    throw new Error("Password minimal harus 6 karakter.");
  }

  const userDocRef = doc(
    db,
    DB_COLLECTIONS.ROOT,
    DB_COLLECTIONS.USERS_DOC,
    DB_COLLECTIONS.USERS_SUB,
    cleanNik
  );
  const snap = await getDoc(userDocRef);

  if (!snap.exists()) {
    throw new Error("NIK tidak terdaftar dalam sistem. Hubungi Super Admin.");
  }

  const userData = snap.data() as UserProfile;

  // Keamanan: Jika sudah pernah aktivasi, tolak aktivasi ulang
  if (userData.passwordSet) {
    throw new Error(
      "Akun dengan NIK ini sudah pernah diaktifkan dan memiliki password resmi. Silakan langsung login di tab Login."
    );
  }

  // Simpan password langsung ke Firestore
  const updateData: Partial<UserProfile> = {
    uid: cleanNik,
    password: cleanPass,
    passwordSet: true,
    activatedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await updateDoc(userDocRef, updateData);

  const activatedProfile: UserProfile = {
    ...userData,
    ...updateData,
    nik: cleanNik,
    uid: cleanNik,
    passwordSet: true,
  };

  isLogoutInProgress = false;
  saveSession(activatedProfile);
  return activatedProfile;
};

/**
 * Login Pengguna dengan NIK atau Email langsung mencocokkan password di Firestore
 */
export const loginWithNikAndPassword = async (
  identifier: string,
  password: string
): Promise<{ user: { uid: string; email: string; displayName: string }; profile: UserProfile }> => {
  const cleanId = identifier.trim();
  const cleanPass = password.trim();

  if (!cleanId || !cleanPass) {
    throw new Error("NIK/Email dan Password wajib diisi.");
  }

  let foundProfile: UserProfile | null = null;
  let targetNik = cleanId;

  // 1. Cari via NIK langsung
  const userDocRef = doc(
    db,
    DB_COLLECTIONS.ROOT,
    DB_COLLECTIONS.USERS_DOC,
    DB_COLLECTIONS.USERS_SUB,
    cleanId
  );
  const snap = await getDoc(userDocRef);

  if (snap.exists()) {
    foundProfile = { ...snap.data(), nik: cleanId } as UserProfile;
    targetNik = cleanId;
  } else {
    // 2. Jika bukan NIK atau menggunakan Email, cari berdasarkan field email
    const usersCollRef = collection(
      db,
      DB_COLLECTIONS.ROOT,
      DB_COLLECTIONS.USERS_DOC,
      DB_COLLECTIONS.USERS_SUB
    );
    const emailQuery = query(usersCollRef, where("email", "==", cleanId.toLowerCase()));
    const emailSnap = await getDocs(emailQuery);

    if (!emailSnap.empty) {
      const docSnap = emailSnap.docs[0];
      foundProfile = { ...docSnap.data(), nik: docSnap.id } as UserProfile;
      targetNik = docSnap.id;
    }
  }

  // 3. Fallback Khusus Inisialisasi Super Admin Pertama Kali
  if (!foundProfile && (cleanId.toLowerCase() === "admin" || cleanId.toLowerCase() === "admin@pegadaian.co.id")) {
    // Cek apakah sudah ada admin lain di sistem
    const usersCollRef = collection(
      db,
      DB_COLLECTIONS.ROOT,
      DB_COLLECTIONS.USERS_DOC,
      DB_COLLECTIONS.USERS_SUB
    );
    const adminQuery = query(usersCollRef, where("role", "==", "admin"));
    const adminSnap = await getDocs(adminQuery);

    if (adminSnap.empty) {
      // Inisialisasi otomatis akun super admin default di Firestore
      const defaultAdmin: UserProfile = {
        uid: "admin",
        nik: "admin",
        displayName: "Super Admin",
        email: "admin@pegadaian.co.id",
        password: cleanPass,
        role: "admin",
        kanwil: "Kantor Pusat",
        jabatan: "IT LAYANAN DACEN",
        passwordSet: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(doc(db, DB_COLLECTIONS.ROOT, DB_COLLECTIONS.USERS_DOC, DB_COLLECTIONS.USERS_SUB, "admin"), defaultAdmin);
      foundProfile = defaultAdmin;
    }
  }

  if (!foundProfile) {
    throw new Error("NIK atau Email tidak terdaftar dalam sistem.");
  }

  // Cek apakah akun belum diaktivasi (khusus user yang belum buat password)
  if (!foundProfile.passwordSet) {
    throw new Error(
      "Akun NIK ini belum diaktivasi! Silakan buka tab 'Register' untuk membuat password pertama kali."
    );
  }

  // Cocokkan password langsung dari Firestore
  if ((foundProfile.password || "").trim() !== cleanPass) {
    throw new Error("Password yang Anda masukkan salah.");
  }

  // Simpan sesi login lokal
  isLogoutInProgress = false;
  saveSession(foundProfile);

  return {
    user: {
      uid: targetNik,
      email: foundProfile.email || "",
      displayName: foundProfile.displayName || "Karyawan",
    },
    profile: foundProfile,
  };
};

/**
 * Sinkronisasi data profil pengguna dari Firestore
 */
export const syncUserProfile = async (
  user?: any,
  customData?: Partial<UserProfile>
): Promise<UserProfile> => {
  const stored = getStoredSession();
  if (!stored) {
    return user || null;
  }

  const nik = user?.uid || user?.nik || stored?.nik;

  if (nik) {
    const userDocRef = doc(
      db,
      DB_COLLECTIONS.ROOT,
      DB_COLLECTIONS.USERS_DOC,
      DB_COLLECTIONS.USERS_SUB,
      nik
    );
    const snap = await getDoc(userDocRef);

    // Cek kembali: jika user sudah logout selama network request berjalan, jangan simpan sesi!
    const currentStored = getStoredSession();
    if (!currentStored || currentStored.nik !== nik) {
      return user || null;
    }

    if (snap.exists()) {
      const data = { ...snap.data(), nik: snap.id } as UserProfile;
      if (customData) {
        await updateDoc(userDocRef, customData);
        const updated = { ...data, ...customData };
        saveSession(updated);
        return updated;
      }
      saveSession(data);
      return data;
    }
  }

  if (stored) return stored;

  throw new Error("Tidak ada sesi pengguna aktif.");
};

/**
 * Mengambil seluruh profil user dari `absensi-app/users data/karyawan`
 */
export const getAllUserProfiles = async (): Promise<UserProfile[]> => {
  const usersCollRef = collection(
    db,
    DB_COLLECTIONS.ROOT,
    DB_COLLECTIONS.USERS_DOC,
    DB_COLLECTIONS.USERS_SUB
  );
  const snap = await getDocs(usersCollRef);
  return snap.docs.map((d) => {
    const data = d.data() as UserProfile;
    return {
      ...data,
      nik: data.nik || d.id,
      uid: data.uid || d.id,
    };
  });
};

/**
 * Mengubah role pengguna di Firestore
 */
export const updateUserRole = async (
  nik: string,
  newRole: "admin" | "user" | string
): Promise<void> => {
  const userDocRef = doc(
    db,
    DB_COLLECTIONS.ROOT,
    DB_COLLECTIONS.USERS_DOC,
    DB_COLLECTIONS.USERS_SUB,
    nik
  );
  await updateDoc(userDocRef, {
    role: newRole,
    updatedAt: serverTimestamp(),
  });
};

/**
 * Super Admin mereset status password karyawan agar bisa aktivasi ulang di tab Register
 */
export const adminResetUserPasswordStatus = async (
  nik: string
): Promise<void> => {
  const userDocRef = doc(
    db,
    DB_COLLECTIONS.ROOT,
    DB_COLLECTIONS.USERS_DOC,
    DB_COLLECTIONS.USERS_SUB,
    nik
  );
  await updateDoc(userDocRef, {
    password: "",
    passwordSet: false,
    updatedAt: serverTimestamp(),
  });
};

/**
 * Super Admin langsung mengatur password baru untuk karyawan di Firestore
 */
export const adminSetUserPassword = async (
  nik: string,
  newPassword: string
): Promise<void> => {
  const userDocRef = doc(
    db,
    DB_COLLECTIONS.ROOT,
    DB_COLLECTIONS.USERS_DOC,
    DB_COLLECTIONS.USERS_SUB,
    nik
  );
  await updateDoc(userDocRef, {
    password: newPassword.trim(),
    passwordSet: true,
    updatedAt: serverTimestamp(),
  });
};

/**
 * Super Admin menghapus data karyawan dari Firestore
 */
export const adminDeleteUser = async (nik: string): Promise<void> => {
  const userDocRef = doc(
    db,
    DB_COLLECTIONS.ROOT,
    DB_COLLECTIONS.USERS_DOC,
    DB_COLLECTIONS.USERS_SUB,
    nik
  );
  await deleteDoc(userDocRef);
};

/**
 * User mengajukan permohonan reset password
 */
export const requestPasswordResetByEmail = async (
  email: string
): Promise<UserProfile> => {
  const usersRef = collection(
    db,
    DB_COLLECTIONS.ROOT,
    DB_COLLECTIONS.USERS_DOC,
    DB_COLLECTIONS.USERS_SUB
  );
  const q = query(usersRef, where("email", "==", email.trim().toLowerCase()));
  const snap = await getDocs(q);

  if (snap.empty) {
    throw new Error("Email tidak terdaftar dalam sistem.");
  }

  const userDoc = snap.docs[0];
  await updateDoc(userDoc.ref, {
    resetRequested: true,
    resetRequestedAt: serverTimestamp(),
  });

  return { ...userDoc.data(), nik: userDoc.id } as UserProfile;
};

/**
 * Admin menyetujui reset password karyawan
 */
export const approveAndSendPasswordReset = async (
  nik: string
): Promise<void> => {
  const userDocRef = doc(
    db,
    DB_COLLECTIONS.ROOT,
    DB_COLLECTIONS.USERS_DOC,
    DB_COLLECTIONS.USERS_SUB,
    nik
  );
  await updateDoc(userDocRef, {
    resetRequested: false,
    password: "",
    passwordSet: false, // Izinkan user buat password baru di Register
    updatedAt: serverTimestamp(),
  });
};

/**
 * Mengambil profil user berdasarkan NIK
 */
export const getUserProfile = async (
  nik: string
): Promise<UserProfile | null> => {
  const userDocRef = doc(
    db,
    DB_COLLECTIONS.ROOT,
    DB_COLLECTIONS.USERS_DOC,
    DB_COLLECTIONS.USERS_SUB,
    nik
  );
  const snap = await getDoc(userDocRef);
  if (snap.exists()) {
    return { ...snap.data(), nik: snap.id } as UserProfile;
  }
  return null;
};

/**
 * Backward compatibility: registerNewUser
 */
export const registerNewUser = async (
  input: RegisterUserInput
): Promise<UserProfile> => {
  return await adminCreateUser({
    nik: input.nik || String(Date.now()).slice(-8),
    displayName: input.displayName,
    email: input.email,
    kanwil: input.kanwil,
    role: input.role,
    jabatan: input.jabatan,
    password: input.password,
  });
};
