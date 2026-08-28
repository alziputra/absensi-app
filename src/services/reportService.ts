import {
  collection,
  collectionGroup,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/config/firebase";
import { DB_COLLECTIONS } from "@/config/constants";
import {
  AbsensiLogItem,
  GroupedAbsensiReport,
  GroupedVisitReport,
} from "@/types";
import { formatDateID, formatTimeID } from "@/utils/formatters";

/**
 * Mengambil seluruh log milik 1 user dari `absensi-app/{userId}/data`
 */
export const getUserAbsensiLogs = async (
  userId: string
): Promise<AbsensiLogItem[]> => {
  const userLogsRef = collection(
    db,
    DB_COLLECTIONS.ROOT_USERS,
    userId,
    DB_COLLECTIONS.USER_LOGS
  );

  const snapshot = await getDocs(userLogsRef);
  const data: AbsensiLogItem[] = snapshot.docs.map((doc) => {
    const docData = doc.data();
    const waktuTimestamp = docData.waktu instanceof Timestamp ? docData.waktu : null;
    const waktuObj = waktuTimestamp ? waktuTimestamp.toDate() : new Date();

    return {
      id: doc.id,
      userId: docData.userId || userId,
      nama: docData.nama,
      email: docData.email,
      kanwil: docData.kanwil,
      role: docData.role,
      tipe_absen: docData.tipe_absen,
      waktu: waktuTimestamp,
      waktuObj,
      foto_url: docData.foto_url || "-",
      lokasi: docData.lokasi || "Tanpa GPS",
      cabang: docData.cabang || "-",
      status_kehadiran: docData.status_kehadiran || "-",
      detail_keterlambatan: docData.detail_keterlambatan || "-",
    };
  });

  // Urutkan dari yang terbaru
  return data.sort((a, b) => b.waktuObj.getTime() - a.waktuObj.getTime());
};

/**
 * Mengambil log SELURUH karyawan via Firestore Collection Group `data`
 */
export const getAllEmployeeLogsForAdmin = async (): Promise<AbsensiLogItem[]> => {
  const q = collectionGroup(db, DB_COLLECTIONS.USER_LOGS);
  const snapshot = await getDocs(q);

  const data: AbsensiLogItem[] = snapshot.docs.map((doc) => {
    const docData = doc.data();
    const waktuTimestamp = docData.waktu instanceof Timestamp ? docData.waktu : null;
    const waktuObj = waktuTimestamp ? waktuTimestamp.toDate() : new Date();
    // Parent document ID adalah UID user
    const parentUserId = doc.ref.parent.parent ? doc.ref.parent.parent.id : docData.userId || "";

    return {
      id: doc.id,
      userId: parentUserId,
      nama: docData.nama || "User",
      email: docData.email || "-",
      kanwil: docData.kanwil || "-",
      role: docData.role || "-",
      tipe_absen: docData.tipe_absen,
      waktu: waktuTimestamp,
      waktuObj,
      foto_url: docData.foto_url || "-",
      lokasi: docData.lokasi || "Tanpa GPS",
      cabang: docData.cabang || "-",
      status_kehadiran: docData.status_kehadiran || "-",
      detail_keterlambatan: docData.detail_keterlambatan || "-",
    };
  });

  return data.sort((a, b) => b.waktuObj.getTime() - a.waktuObj.getTime());
};

/**
 * Ekspor Laporan Absensi (Masuk & Pulang) ke file CSV
 */
export const exportAbsensiToCSV = (logs: AbsensiLogItem[]): boolean => {
  if (logs.length === 0) {
    return false;
  }

  const groupedData: Record<string, GroupedAbsensiReport> = {};

  logs.forEach((log) => {
    const tgl = formatDateID(log.waktuObj);

    if (!groupedData[tgl]) {
      groupedData[tgl] = {
        tanggal: tgl,
        masuk: "-",
        pulang: "-",
        lokasiMasuk: "-",
        lokasiPulang: "-",
        status: "-",
        telat: "-",
      };
    }

    if (log.tipe_absen === "Absen Masuk") {
      groupedData[tgl].masuk = formatTimeID(log.waktuObj);
      groupedData[tgl].lokasiMasuk = log.lokasi || "Tanpa GPS";
      groupedData[tgl].status = log.status_kehadiran || "Tepat Waktu";
      groupedData[tgl].telat = log.detail_keterlambatan || "-";
    } else if (log.tipe_absen === "Absen Pulang") {
      groupedData[tgl].pulang = formatTimeID(log.waktuObj);
      groupedData[tgl].lokasiPulang = log.lokasi || "Tanpa GPS";
    }
  });

  const headers = [
    "Tanggal",
    "Jam Masuk",
    "Status",
    "Keterlambatan",
    "Lokasi Masuk",
    "Jam Pulang",
    "Lokasi Pulang",
  ];

  const csvRows = ["\uFEFF" + headers.join(",")];

  Object.values(groupedData).forEach((row) => {
    const csvLine = [
      row.tanggal,
      row.masuk,
      row.status,
      row.telat,
      `"${row.lokasiMasuk}"`,
      row.pulang,
      `"${row.lokasiPulang}"`,
    ];
    csvRows.push(csvLine.join(","));
  });

  downloadCSV(
    csvRows.join("\n"),
    `Laporan_Absensi_${formatDateID(new Date())}.csv`
  );
  return true;
};

/**
 * Ekspor Laporan Visit ke file CSV
 */
export const exportVisitToCSV = (logs: AbsensiLogItem[]): boolean => {
  if (logs.length === 0) {
    return false;
  }

  const groupedData: Record<string, GroupedVisitReport> = {};

  logs.forEach((log) => {
    if (log.tipe_absen !== "Visit Masuk" && log.tipe_absen !== "Visit Keluar")
      return;

    const tgl = formatDateID(log.waktuObj);
    const key = `${tgl}_${log.cabang}`;

    if (!groupedData[key]) {
      groupedData[key] = {
        tanggal: tgl,
        cabang: log.cabang || "-",
        masuk: "-",
        lokasiMasuk: "-",
        keluar: "-",
        lokasiKeluar: "-",
      };
    }

    if (log.tipe_absen === "Visit Masuk") {
      groupedData[key].masuk = formatTimeID(log.waktuObj);
      groupedData[key].lokasiMasuk = log.lokasi || "Tanpa GPS";
    } else if (log.tipe_absen === "Visit Keluar") {
      groupedData[key].keluar = formatTimeID(log.waktuObj);
      groupedData[key].lokasiKeluar = log.lokasi || "Tanpa GPS";
    }
  });

  const headers = [
    "Tanggal",
    "Cabang/Outlet",
    "Jam Visit Masuk",
    "Lokasi Masuk",
    "Jam Visit Keluar",
    "Lokasi Keluar",
  ];

  const csvRows = ["\uFEFF" + headers.join(",")];

  Object.values(groupedData).forEach((row) => {
    const csvLine = [
      row.tanggal,
      `"${row.cabang}"`,
      row.masuk,
      `"${row.lokasiMasuk}"`,
      row.keluar,
      `"${row.lokasiKeluar}"`,
    ];
    csvRows.push(csvLine.join(","));
  });

  downloadCSV(
    csvRows.join("\n"),
    `Laporan_Visit_${formatDateID(new Date())}.csv`
  );
  return true;
};

const downloadCSV = (content: string, fileName: string) => {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

