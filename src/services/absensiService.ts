import {
  collection,
  doc,
  setDoc,
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
 * `absensi-app/users data/karyawan/{NIK}/data/{docId}`
 * Document ID dibuat tersusun jelas & NON-AUTO (contoh: ABSEN_{NIK}_{YYYY-MM-DD}_{TIPE})
 */
export const recordAbsensi = async (
  userId: string,
  input: AbsensiRecordInput,
  userProfile?: UserProfile | null
) => {
  if (
    !input.lokasi ||
    input.lokasi.includes("Tanpa") ||
    input.lokasi.includes("Gagal")
  ) {
    throw new Error(
      "Lokasi GPS tidak ditemukan atau tidak diizinkan. Absensi wajib menyertakan lokasi GPS yang valid."
    );
  }

  const userIdentifier = userProfile?.nik || input.nik || userId;
  const todayStr = new Date().toISOString().slice(0, 10);
  const isVisit = input.tipe_absen.toLowerCase().includes("visit");
  const tipeClean = input.tipe_absen.replace(/\s+/g, "_").toUpperCase();

  // Document ID NON-AUTO
  const docId = isVisit
    ? `VISIT_${userIdentifier}_${todayStr}_${Date.now()}`
    : `ABSEN_${userIdentifier}_${todayStr}_${tipeClean}`;

  const logDocRef = doc(
    db,
    DB_COLLECTIONS.ROOT,
    DB_COLLECTIONS.USERS_DOC,
    DB_COLLECTIONS.USERS_SUB,
    userIdentifier,
    DB_COLLECTIONS.USER_LOGS,
    docId
  );

  const payload = {
    userId: userId,
    nik: userIdentifier,
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
  };

  await setDoc(logDocRef, payload);

  return docId;
};

/**
 * Mengecek apakah user sudah melakukan absensi tertentu hari ini
 */
export const checkHasAbsenToday = async (
  userId: string,
  tipeAbsen: TipeAbsen,
  userNik?: string
): Promise<boolean> => {
  const userIdentifier = userNik || userId;

  const userLogsRef = collection(
    db,
    DB_COLLECTIONS.ROOT,
    DB_COLLECTIONS.USERS_DOC,
    DB_COLLECTIONS.USERS_SUB,
    userIdentifier,
    DB_COLLECTIONS.USER_LOGS
  );

  const q = query(userLogsRef, where("tipe_absen", "==", tipeAbsen));
  let snapshot = await getDocs(q);

  // Fallback ke struktur lama jika struktur baru masih kosong
  if (snapshot.empty && userIdentifier !== userId) {
    try {
      const legacyLogsRef = collection(
        db,
        DB_COLLECTIONS.ROOT,
        userId,
        DB_COLLECTIONS.USER_LOGS
      );
      snapshot = await getDocs(query(legacyLogsRef, where("tipe_absen", "==", tipeAbsen)));
    } catch {
      // Abaikan jika tidak ada
    }
  }

  const todayStr = new Date().toDateString();

  return snapshot.docs.some((doc) => {
    const data = doc.data();
    const docDate = data.waktu instanceof Timestamp ? data.waktu.toDate() : null;
    return docDate ? docDate.toDateString() === todayStr : false;
  });
};
