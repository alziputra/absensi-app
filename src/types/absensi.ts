import { Timestamp, FieldValue } from "firebase/firestore";

export type TipeAbsen = "Absen Masuk" | "Absen Pulang" | "Visit Masuk" | "Visit Keluar";

export type StatusKehadiran = "Tepat Waktu" | "Terlambat" | "-";

export interface AbsensiRecordInput {
  tipe_absen: TipeAbsen;
  foto_url: string;
  lokasi: string;
  cabang?: string;
  status_kehadiran?: StatusKehadiran;
  detail_keterlambatan?: string;
  userId?: string;
  nama?: string;
  email?: string;
  kanwil?: string;
  role?: string;
}

export interface AbsensiLogItem {
  id: string;
  userId: string;
  nama?: string;
  email?: string;
  kanwil?: string;
  role?: string;
  tipe_absen: TipeAbsen;
  waktu: Timestamp | null;
  waktuObj: Date;
  foto_url: string;
  lokasi: string;
  cabang: string;
  status_kehadiran: StatusKehadiran | string;
  detail_keterlambatan: string;
}

export interface GroupedAbsensiReport {
  tanggal: string;
  masuk: string;
  pulang: string;
  lokasiMasuk: string;
  lokasiPulang: string;
  status: string;
  telat: string;
}

export interface GroupedVisitReport {
  tanggal: string;
  cabang: string;
  masuk: string;
  lokasiMasuk: string;
  keluar: string;
  lokasiKeluar: string;
}

