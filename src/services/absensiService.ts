import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/config/firebase";
import { DB_COLLECTIONS } from "@/config/constants";
import { AbsensiRecordInput, TipeAbsen, UserProfile } from "@/types";

/**
 * Menyimpan rekaman absensi ke sub-collection:
 * `absensi-app/{userId}/data/{docId}`
 */
export const recordAbsensi = async (
  userId: string,
  input: AbsensiRecordInput,
  userProfile?: UserProfile | null
) => {
  const userLogsRef = collection(
    db,
    DB_COLLECTIONS.ROOT_USERS,
    userId,
    DB_COLLECTIONS.USER_LOGS
  );

  const newDoc = await addDoc(userLogsRef, {
    userId: userId,
    nama: input.nama || userProfile?.displayName || "Karyawan",
    email: input.email || userProfile?.email || "-",
    kanwil: input.kanwil || userProfile?.kanwil || "Kanwil XII - Surabaya",
    role: input.role || userProfile?.role || "Desktop Support",
    tipe_absen: input.tipe_absen,
    waktu: serverTimestamp(),
    foto_url: input.foto_url || "-",
    lokasi: input.lokasi || "Tanpa GPS",
    cabang: input.cabang || "-",
    status_kehadiran: input.status_kehadiran || "-",
    detail_keterlambatan: input.detail_keterlambatan || "-",
  });

  return newDoc.id;
};

/**
 * Mengecek apakah user sudah melakukan absensi tertentu hari ini
 */
export const checkHasAbsenToday = async (
  userId: string,
  tipeAbsen: TipeAbsen
): Promise<boolean> => {
  const userLogsRef = collection(
    db,
    DB_COLLECTIONS.ROOT_USERS,
    userId,
    DB_COLLECTIONS.USER_LOGS
  );

  const q = query(userLogsRef, where("tipe_absen", "==", tipeAbsen));
  const snapshot = await getDocs(q);
  const todayStr = new Date().toDateString();

  return snapshot.docs.some((doc) => {
    const data = doc.data();
    const docDate = data.waktu instanceof Timestamp ? data.waktu.toDate() : null;
    return docDate ? docDate.toDateString() === todayStr : false;
  });
};

