import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/config/firebase";
import { DB_COLLECTIONS, WORK_HOURS } from "@/config/constants";
import {
  KlaimAbsenItem,
  KlaimInput,
  UserProfile,
} from "@/types";
import { calculateLateStatus } from "@/utils/formatters";

/**
 * Membuat pengajuan klaim lupa absen baru
 */
export const createKlaimAbsensi = async (
  userId: string,
  input: KlaimInput,
  userProfile?: UserProfile | null
): Promise<string> => {
  if (!input.tanggal) {
    throw new Error("Tanggal kehadiran wajib dipilih.");
  }
  if (!input.alasan.trim()) {
    throw new Error("Alasan lupa absen wajib diisi secara jelas.");
  }

  const klaimRef = collection(db, DB_COLLECTIONS.KLAIM_ABSENSI);

  const newDoc = await addDoc(klaimRef, {
    userId,
    nama: userProfile?.displayName || "Karyawan",
    email: userProfile?.email || "-",
    kanwil: userProfile?.kanwil || "Kanwil XII - Surabaya",
    role: userProfile?.role || "Desktop Support",
    tanggal: input.tanggal,
    tipe_klaim: input.tipe_klaim,
    jam_masuk: input.jam_masuk || "-",
    jam_pulang: input.jam_pulang || "-",
    alasan: input.alasan.trim(),
    foto_url: input.foto_url || "-",
    status: "PENDING",
    catatan_admin: "-",
    reviewed_by: "-",
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });

  return newDoc.id;
};

/**
 * Mengambil riwayat pengajuan klaim oleh 1 user
 */
export const getUserKlaimList = async (
  userId: string
): Promise<KlaimAbsenItem[]> => {
  const klaimRef = collection(db, DB_COLLECTIONS.KLAIM_ABSENSI);
  const q = query(klaimRef, where("userId", "==", userId));
  const snapshot = await getDocs(q);

  const list: KlaimAbsenItem[] = snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    const createdTimestamp =
      data.created_at instanceof Timestamp ? data.created_at : null;
    const createdAtObj = createdTimestamp
      ? createdTimestamp.toDate()
      : new Date();

    return {
      id: docSnap.id,
      userId: data.userId || userId,
      nama: data.nama || "User",
      email: data.email || "-",
      kanwil: data.kanwil || "-",
      role: data.role || "-",
      tanggal: data.tanggal,
      tipe_klaim: data.tipe_klaim,
      jam_masuk: data.jam_masuk || "-",
      jam_pulang: data.jam_pulang || "-",
      alasan: data.alasan || "-",
      foto_url: data.foto_url || "-",
      status: data.status || "PENDING",
      catatan_admin: data.catatan_admin || "-",
      reviewed_by: data.reviewed_by || "-",
      created_at: createdTimestamp,
      createdAtObj,
      updated_at:
        data.updated_at instanceof Timestamp ? data.updated_at : null,
    };
  });

  return list.sort((a, b) => b.createdAtObj.getTime() - a.createdAtObj.getTime());
};

/**
 * Mengambil seluruh pengajuan klaim untuk kebutuhan Admin Panel
 */
export const getAllKlaimListForAdmin = async (): Promise<KlaimAbsenItem[]> => {
  const klaimRef = collection(db, DB_COLLECTIONS.KLAIM_ABSENSI);
  const snapshot = await getDocs(klaimRef);

  const list: KlaimAbsenItem[] = snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    const createdTimestamp =
      data.created_at instanceof Timestamp ? data.created_at : null;
    const createdAtObj = createdTimestamp
      ? createdTimestamp.toDate()
      : new Date();

    return {
      id: docSnap.id,
      userId: data.userId || "",
      nama: data.nama || "User",
      email: data.email || "-",
      kanwil: data.kanwil || "-",
      role: data.role || "-",
      tanggal: data.tanggal,
      tipe_klaim: data.tipe_klaim,
      jam_masuk: data.jam_masuk || "-",
      jam_pulang: data.jam_pulang || "-",
      alasan: data.alasan || "-",
      foto_url: data.foto_url || "-",
      status: data.status || "PENDING",
      catatan_admin: data.catatan_admin || "-",
      reviewed_by: data.reviewed_by || "-",
      created_at: createdTimestamp,
      createdAtObj,
      updated_at:
        data.updated_at instanceof Timestamp ? data.updated_at : null,
    };
  });

  return list.sort((a, b) => b.createdAtObj.getTime() - a.createdAtObj.getTime());
};

/**
 * Super Admin Menyetujui Klaim Absensi
 * 1. Update status klaim menjadi APPROVED
 * 2. Menyisipkan rekaman log absensi resmi ke absensi-app/{userId}/data
 */
export const approveKlaimAbsensi = async (
  klaim: KlaimAbsenItem,
  adminName: string,
  adminNotes?: string
): Promise<void> => {
  // 1. Update dokumen klaim
  const klaimDocRef = doc(db, DB_COLLECTIONS.KLAIM_ABSENSI, klaim.id);
  await updateDoc(klaimDocRef, {
    status: "APPROVED",
    catatan_admin: adminNotes || "Disetujui oleh Super Admin",
    reviewed_by: adminName || "Super Admin",
    updated_at: serverTimestamp(),
  });

  // 2. Tulis log absensi ke sub-koleksi user
  const userLogsRef = collection(
    db,
    DB_COLLECTIONS.ROOT_USERS,
    klaim.userId,
    DB_COLLECTIONS.USER_LOGS
  );

  // Parse tanggal & jam klaim untuk membuat Date object yang sesuai
  const [yearStr, monthStr, dayStr] = klaim.tanggal.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1; // 0-indexed
  const day = parseInt(dayStr, 10);

  // Proses Absen Masuk jika termasuk dalam tipe klaim
  if (
    klaim.tipe_klaim === "Absen Masuk" ||
    klaim.tipe_klaim === "Absen Masuk & Pulang"
  ) {
    let checkinDate = new Date(year, month, day, 8, 0, 0); // default 08:00
    if (klaim.jam_masuk && klaim.jam_masuk.includes(":")) {
      const [h, m] = klaim.jam_masuk.split(":");
      checkinDate = new Date(year, month, day, parseInt(h, 10), parseInt(m, 10), 0);
    }

    const lateInfo = calculateLateStatus(
      checkinDate,
      WORK_HOURS.MAX_CHECKIN_HOUR,
      WORK_HOURS.MAX_CHECKIN_MINUTE
    );

    await addDoc(userLogsRef, {
      userId: klaim.userId,
      nama: klaim.nama,
      email: klaim.email,
      kanwil: klaim.kanwil,
      role: klaim.role,
      tipe_absen: "Absen Masuk",
      waktu: Timestamp.fromDate(checkinDate),
      foto_url: klaim.foto_url || "-",
      lokasi: "Klaim Disetujui Admin",
      cabang: "-",
      status_kehadiran: lateInfo.status,
      detail_keterlambatan: lateInfo.detail,
    });
  }

  // Proses Absen Pulang jika termasuk dalam tipe klaim
  if (
    klaim.tipe_klaim === "Absen Pulang" ||
    klaim.tipe_klaim === "Absen Masuk & Pulang"
  ) {
    let checkoutDate = new Date(year, month, day, 17, 0, 0); // default 17:00
    if (klaim.jam_pulang && klaim.jam_pulang.includes(":")) {
      const [h, m] = klaim.jam_pulang.split(":");
      checkoutDate = new Date(year, month, day, parseInt(h, 10), parseInt(m, 10), 0);
    }

    await addDoc(userLogsRef, {
      userId: klaim.userId,
      nama: klaim.nama,
      email: klaim.email,
      kanwil: klaim.kanwil,
      role: klaim.role,
      tipe_absen: "Absen Pulang",
      waktu: Timestamp.fromDate(checkoutDate),
      foto_url: klaim.foto_url || "-",
      lokasi: "Klaim Disetujui Admin",
      cabang: "-",
      status_kehadiran: "-",
      detail_keterlambatan: "-",
    });
  }
};

/**
 * Super Admin Menolak Klaim Absensi
 */
export const rejectKlaimAbsensi = async (
  klaimId: string,
  adminName: string,
  alasanPenolakan: string
): Promise<void> => {
  const klaimDocRef = doc(db, DB_COLLECTIONS.KLAIM_ABSENSI, klaimId);
  await updateDoc(klaimDocRef, {
    status: "REJECTED",
    catatan_admin: alasanPenolakan.trim() || "Klaim ditolak oleh Super Admin",
    reviewed_by: adminName || "Super Admin",
    updated_at: serverTimestamp(),
  });
};
