import { Timestamp } from "firebase/firestore";

export type StatusKlaim = "PENDING" | "APPROVED" | "REJECTED";

export type TipeKlaim = "Absen Masuk" | "Absen Pulang" | "Absen Masuk & Pulang";

export interface KlaimInput {
  tanggal: string; // YYYY-MM-DD
  tipe_klaim: TipeKlaim;
  jam_masuk?: string; // HH:mm
  jam_pulang?: string; // HH:mm
  alasan: string;
  foto_url?: string;
}

export interface KlaimAbsenItem {
  id: string;
  userId: string;
  nama: string;
  email: string;
  kanwil: string;
  role: string;
  tanggal: string;
  tipe_klaim: TipeKlaim;
  jam_masuk?: string;
  jam_pulang?: string;
  alasan: string;
  foto_url: string;
  status: StatusKlaim;
  catatan_admin?: string;
  reviewed_by?: string;
  created_at: Timestamp | null;
  createdAtObj: Date;
  updated_at?: Timestamp | null;
}
