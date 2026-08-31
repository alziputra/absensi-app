export const DB_COLLECTIONS = {
  ROOT_USERS: "absensi-app", // Root collection
  USER_LOGS: "data",        // Sub-collection under each user document
  KLAIM_ABSENSI: "klaim_absensi", // Collection for attendance claims
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

// Pilihan Role Sistem
export const ROLE_OPTIONS = ["admin", "user"] as const;
export type AppRole = (typeof ROLE_OPTIONS)[number];
