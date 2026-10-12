export const DB_COLLECTIONS = {
  // Hierarki Firestore Baru:
  // Root: "absensi-app"
  // Users: absensi-app/users data/karyawan/{nik}
  // User Logs: absensi-app/users data/karyawan/{nik}/data/{docId}
  // Klaim: absensi-app/klaim absensi/items/{docId}
  ROOT: "absensi-app",
  USERS_DOC: "users data",
  USERS_SUB: "karyawan",
  KLAIM_DOC: "klaim absensi",
  KLAIM_SUB: "items",
  USER_LOGS: "data",

  // Backward compatibility alias
  ROOT_USERS: "absensi-app",
  KLAIM_ABSENSI: "klaim_absensi",
} as const;

// Batas Jam Kerja & Toleransi
export const WORK_HOURS = {
  MAX_CHECKIN_HOUR: 8,
  MAX_CHECKIN_MINUTE: 0,
} as const;

// Pilihan Kantor Wilayah Pegadaian
export const KANWIL_OPTIONS: string[] = [
  "Kanwil XII - Surabaya",
  "Kanwil I - Medan",
  "Kanwil II - Pekanbaru",
  "Kanwil III - Palembang",
  "Kanwil IV - Balikpapan",
  "Kanwil V - Manado",
  "Kanwil VI - Makassar",
  "Kanwil VII - Denpasar",
  "Kanwil VIII - Jakarta 1",
  "Kanwil IX - Jakarta 2",
  "Kanwil X - Bandung",
  "Kanwil XI - Semarang",
  "Kantor Pusat",
];

// Pilihan Role Sistem (Hanya Admin dan User)
export const ROLE_OPTIONS = ["admin", "user"] as const;
export type AppRole = (typeof ROLE_OPTIONS)[number];

// Pilihan Jabatan / Unit Kerja
export const JABATAN_OPTIONS = [
  "IT LAYANAN DACEN",
  "LAYANAN DESKTOP",
  "SA - MONITORING",
  "MS KANWIL",
  "PM & REKON",
] as const;
export type AppJabatan = (typeof JABATAN_OPTIONS)[number];
