import {
  collection,
  doc,
  setDoc,
  getDocs,
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
 * Path Firestore: `absensi-app/klaim absensi/items/{docId}`
 * Document ID: NON-AUTO (format: KLAIM_{NIK}_{YYYYMMDD}_{TIPE}_{TIMESTAMP})
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

  const userIdentifier = userProfile?.nik || userId;
  const cleanDate = input.tanggal.replace(/-/g, "");
  const tipeClean = input.tipe_klaim
    .replace(/\s+/g, "_")
    .replace(/&/g, "DAN")
    .toUpperCase();
  const docId = `KLAIM_${userIdentifier}_${cleanDate}_${tipeClean}_${Date.now()}`;

  const klaimDocRef = doc(
    db,
    DB_COLLECTIONS.ROOT,
    DB_COLLECTIONS.KLAIM_DOC,
    DB_COLLECTIONS.KLAIM_SUB,
    docId
  );

  const payload = {
    userId,
    nik: userIdentifier,
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
  };

  await setDoc(klaimDocRef, payload);
  return docId;
};

/**
 * Mengambil riwayat pengajuan klaim oleh 1 user
 */
export const getUserKlaimList = async (
  userId: string,
  userNik?: string
): Promise<KlaimAbsenItem[]> => {
  const klaimRef = collection(
    db,
    DB_COLLECTIONS.ROOT,
    DB_COLLECTIONS.KLAIM_DOC,
    DB_COLLECTIONS.KLAIM_SUB
  );

  // Ambil berdasarkan userId
  const qUserId = query(klaimRef, where("userId", "==", userId));
  const snapUserId = await getDocs(qUserId);
  const mapResults = new Map<string, KlaimAbsenItem>();

  snapUserId.docs.forEach((docSnap) => {
    const data = docSnap.data();
    const createdTimestamp =
      data.created_at instanceof Timestamp ? data.created_at : null;
    const createdAtObj = createdTimestamp
      ? createdTimestamp.toDate()
      : new Date();

    mapResults.set(docSnap.id, {
      id: docSnap.id,
      userId: data.userId || userId,
      nik: data.nik || userNik || "-",
      nama: data.nama || "Karyawan",
      email: data.email || "-",
      kanwil: data.kanwil || "-",
      role: data.role || "-",
      tanggal: data.tanggal,
      tipe_klaim: data.tipe_klaim,
      jam_masuk: data.jam_masuk,
      jam_pulang: data.jam_pulang,
      alasan: data.alasan,
      foto_url: data.foto_url || "-",
      status: data.status || "PENDING",
      catatan_admin: data.catatan_admin || "-",
      reviewed_by: data.reviewed_by || "-",
      created_at: createdTimestamp,
      createdAtObj,
      updated_at: data.updated_at instanceof Timestamp ? data.updated_at : null,
    });
  });

  // Jika ada userNik, cari juga berdasarkan NIK
  if (userNik) {
    const qNik = query(klaimRef, where("nik", "==", userNik));
    const snapNik = await getDocs(qNik);
    snapNik.docs.forEach((docSnap) => {
      if (!mapResults.has(docSnap.id)) {
        const data = docSnap.data();
        const createdTimestamp =
          data.created_at instanceof Timestamp ? data.created_at : null;
        const createdAtObj = createdTimestamp
          ? createdTimestamp.toDate()
          : new Date();

        mapResults.set(docSnap.id, {
          id: docSnap.id,
          userId: data.userId || userId,
          nik: data.nik || userNik,
          nama: data.nama || "Karyawan",
          email: data.email || "-",
          kanwil: data.kanwil || "-",
          role: data.role || "-",
          tanggal: data.tanggal,
          tipe_klaim: data.tipe_klaim,
          jam_masuk: data.jam_masuk,
          jam_pulang: data.jam_pulang,
          alasan: data.alasan,
          foto_url: data.foto_url || "-",
          status: data.status || "PENDING",
          catatan_admin: data.catatan_admin || "-",
          reviewed_by: data.reviewed_by || "-",
          created_at: createdTimestamp,
          createdAtObj,
          updated_at:
            data.updated_at instanceof Timestamp ? data.updated_at : null,
        });
      }
    });
  }

  // Fallback ke koleksi lama jika belum ada
  if (mapResults.size === 0) {
    try {
      const legacyRef = collection(db, DB_COLLECTIONS.KLAIM_ABSENSI);
      const legacySnap = await getDocs(query(legacyRef, where("userId", "==", userId)));
      legacySnap.docs.forEach((docSnap) => {
        const data = docSnap.data();
        const createdTimestamp =
          data.created_at instanceof Timestamp ? data.created_at : null;
        mapResults.set(docSnap.id, {
          id: docSnap.id,
          userId: data.userId || userId,
          nik: data.nik || userNik || "-",
          nama: data.nama || "Karyawan",
          email: data.email || "-",
          kanwil: data.kanwil || "-",
          role: data.role || "-",
          tanggal: data.tanggal,
          tipe_klaim: data.tipe_klaim,
          jam_masuk: data.jam_masuk,
          jam_pulang: data.jam_pulang,
          alasan: data.alasan,
          foto_url: data.foto_url || "-",
          status: data.status || "PENDING",
          catatan_admin: data.catatan_admin || "-",
          reviewed_by: data.reviewed_by || "-",
          created_at: createdTimestamp,
          createdAtObj: createdTimestamp ? createdTimestamp.toDate() : new Date(),
          updated_at: data.updated_at instanceof Timestamp ? data.updated_at : null,
        });
      });
    } catch {
      // Abaikan jika tidak ada
    }
  }

  const list = Array.from(mapResults.values());
  return list.sort((a, b) => b.createdAtObj.getTime() - a.createdAtObj.getTime());
};

/**
 * Super Admin Mengambil Seluruh Klaim Absensi Karyawan
 */
export const getAllKlaimListForAdmin = async (): Promise<KlaimAbsenItem[]> => {
  const klaimRef = collection(
    db,
    DB_COLLECTIONS.ROOT,
    DB_COLLECTIONS.KLAIM_DOC,
    DB_COLLECTIONS.KLAIM_SUB
  );
  const snapshot = await getDocs(klaimRef);
  const mapResults = new Map<string, KlaimAbsenItem>();

  snapshot.docs.forEach((docSnap) => {
    const data = docSnap.data();
    const createdTimestamp =
      data.created_at instanceof Timestamp ? data.created_at : null;
    const createdAtObj = createdTimestamp
      ? createdTimestamp.toDate()
      : new Date();

    mapResults.set(docSnap.id, {
      id: docSnap.id,
      userId: data.userId || "",
      nik: data.nik || "-",
      nama: data.nama || "Karyawan",
      email: data.email || "-",
      kanwil: data.kanwil || "-",
      role: data.role || "-",
      tanggal: data.tanggal,
      tipe_klaim: data.tipe_klaim,
      jam_masuk: data.jam_masuk,
      jam_pulang: data.jam_pulang,
      alasan: data.alasan,
      foto_url: data.foto_url || "-",
      status: data.status || "PENDING",
      catatan_admin: data.catatan_admin || "-",
      reviewed_by: data.reviewed_by || "-",
      created_at: createdTimestamp,
      createdAtObj,
      updated_at: data.updated_at instanceof Timestamp ? data.updated_at : null,
    });
  });

  // Gabungkan dari koleksi lama jika ada
  try {
    const legacyRef = collection(db, DB_COLLECTIONS.KLAIM_ABSENSI);
    const legacySnap = await getDocs(legacyRef);
    legacySnap.docs.forEach((docSnap) => {
      if (!mapResults.has(docSnap.id)) {
        const data = docSnap.data();
        const createdTimestamp =
          data.created_at instanceof Timestamp ? data.created_at : null;
        mapResults.set(docSnap.id, {
          id: docSnap.id,
          userId: data.userId || "",
          nik: data.nik || "-",
          nama: data.nama || "Karyawan",
          email: data.email || "-",
          kanwil: data.kanwil || "-",
          role: data.role || "-",
          tanggal: data.tanggal,
          tipe_klaim: data.tipe_klaim,
          jam_masuk: data.jam_masuk,
          jam_pulang: data.jam_pulang,
          alasan: data.alasan,
          foto_url: data.foto_url || "-",
          status: data.status || "PENDING",
          catatan_admin: data.catatan_admin || "-",
          reviewed_by: data.reviewed_by || "-",
          created_at: createdTimestamp,
          createdAtObj: createdTimestamp ? createdTimestamp.toDate() : new Date(),
          updated_at: data.updated_at instanceof Timestamp ? data.updated_at : null,
        });
      }
    });
  } catch {
    // Abaikan
  }

  const list = Array.from(mapResults.values());
  return list.sort((a, b) => b.createdAtObj.getTime() - a.createdAtObj.getTime());
};

/**
 * Super Admin Menyetujui Klaim Absensi
 * 1. Update status klaim menjadi APPROVED
 * 2. Menyisipkan rekaman log absensi resmi dengan Document ID NON-AUTO
 */
export const approveKlaimAbsensi = async (
  klaim: KlaimAbsenItem,
  adminName: string,
  adminNotes?: string
): Promise<void> => {
  // 1. Update dokumen klaim di lokasi baru
  const klaimDocRef = doc(
    db,
    DB_COLLECTIONS.ROOT,
    DB_COLLECTIONS.KLAIM_DOC,
    DB_COLLECTIONS.KLAIM_SUB,
    klaim.id
  );

  try {
    await updateDoc(klaimDocRef, {
      status: "APPROVED",
      catatan_admin: adminNotes || "Disetujui oleh Super Admin",
      reviewed_by: adminName || "Super Admin",
      updated_at: serverTimestamp(),
    });
  } catch {
    // Jika tidak ditemukan di lokasi baru, coba update di lokasi lama
    try {
      const legacyDocRef = doc(db, DB_COLLECTIONS.KLAIM_ABSENSI, klaim.id);
      await updateDoc(legacyDocRef, {
        status: "APPROVED",
        catatan_admin: adminNotes || "Disetujui oleh Super Admin",
        reviewed_by: adminName || "Super Admin",
        updated_at: serverTimestamp(),
      });
    } catch {
      // Abaikan
    }
  }

  // 2. Tulis log absensi ke sub-koleksi user dengan Document ID NON-AUTO
  const userIdentifier = klaim.nik && klaim.nik !== "-" ? klaim.nik : klaim.userId;

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

    const docIdMasuk = `ABSEN_${userIdentifier}_${klaim.tanggal}_ABSEN_MASUK`;
    const logDocRefMasuk = doc(
      db,
      DB_COLLECTIONS.ROOT,
      DB_COLLECTIONS.USERS_DOC,
      DB_COLLECTIONS.USERS_SUB,
      userIdentifier,
      DB_COLLECTIONS.USER_LOGS,
      docIdMasuk
    );

    await setDoc(logDocRefMasuk, {
      userId: klaim.userId,
      nik: userIdentifier,
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

    const docIdPulang = `ABSEN_${userIdentifier}_${klaim.tanggal}_ABSEN_PULANG`;
    const logDocRefPulang = doc(
      db,
      DB_COLLECTIONS.ROOT,
      DB_COLLECTIONS.USERS_DOC,
      DB_COLLECTIONS.USERS_SUB,
      userIdentifier,
      DB_COLLECTIONS.USER_LOGS,
      docIdPulang
    );

    await setDoc(logDocRefPulang, {
      userId: klaim.userId,
      nik: userIdentifier,
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
  rejectionReason: string
): Promise<void> => {
  const klaimDocRef = doc(
    db,
    DB_COLLECTIONS.ROOT,
    DB_COLLECTIONS.KLAIM_DOC,
    DB_COLLECTIONS.KLAIM_SUB,
    klaimId
  );

  try {
    await updateDoc(klaimDocRef, {
      status: "REJECTED",
      catatan_admin: rejectionReason || "Ditolak oleh Super Admin",
      reviewed_by: adminName || "Super Admin",
      updated_at: serverTimestamp(),
    });
  } catch {
    // Fallback jika klaim di lokasi lama
    try {
      const legacyDocRef = doc(db, DB_COLLECTIONS.KLAIM_ABSENSI, klaimId);
      await updateDoc(legacyDocRef, {
        status: "REJECTED",
        catatan_admin: rejectionReason || "Ditolak oleh Super Admin",
        reviewed_by: adminName || "Super Admin",
        updated_at: serverTimestamp(),
      });
    } catch {
      // Abaikan
    }
  }
};
