import ExcelJS from "exceljs";
import { AbsensiLogItem } from "@/types";
import { formatDateID, formatTimeID } from "@/utils/formatters";

export interface GenerateExcelReportOptions {
  nama: string;
  jabatan: string;
  namaPerusahaan: string;
  periodeText: string;
  startDate: Date;
  endDate: Date;
  logs: AbsensiLogItem[];
}

const NAMA_HARI = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];

const NAMA_BULAN_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

const NAMA_BULAN_FULL = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

/**
 * Menghasilkan file Excel (.xlsx) resmi dengan styling dan template
 * sesuai format "ABSENSI MANAGE SERVICE - Layanan Kantor Wilayah"
 */
export const generateManageServiceExcel = async (
  options: GenerateExcelReportOptions
): Promise<void> => {
  const {
    nama,
    jabatan,
    namaPerusahaan,
    periodeText,
    startDate,
    endDate,
    logs,
  } = options;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Aplikasi Absensi Pegadaian";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Absensi", {
    views: [{ showGridLines: true }],
  });

  // Set Column Widths
  worksheet.columns = [
    { key: "hari", width: 14 }, // A
    { key: "tanggal", width: 16 }, // B
    { key: "masuk", width: 13 }, // C
    { key: "pulang", width: 13 }, // D
    { key: "jamKerja", width: 18 }, // E
    { key: "lokasi", width: 30 }, // F
  ];

  // --- ROW 1: JUDUL UTAMA ---
  worksheet.mergeCells("A1:F1");
  const titleCell = worksheet.getCell("A1");
  titleCell.value = "ABSENSI MANAGE SERVICE";
  titleCell.font = { name: "Calibri", size: 14, bold: true, color: { argb: "FF000000" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  worksheet.getRow(1).height = 24;

  // --- ROW 2: SUB JUDUL ---
  worksheet.mergeCells("A2:F2");
  const subtitleCell = worksheet.getCell("A2");
  subtitleCell.value = "Layanan Kantor Wilayah";
  subtitleCell.font = { name: "Calibri", size: 12, bold: true, color: { argb: "FF000000" } };
  subtitleCell.alignment = { horizontal: "center", vertical: "middle" };
  worksheet.getRow(2).height = 20;

  // Helper border styling
  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: "thin", color: { argb: "FF000000" } },
    left: { style: "thin", color: { argb: "FF000000" } },
    bottom: { style: "thin", color: { argb: "FF000000" } },
    right: { style: "thin", color: { argb: "FF000000" } },
  };

  // Format String Rentang Tanggal (contoh: 21 Juli 2026 - 20 Agustus 2026)
  const startStrFull = `${startDate.getDate()} ${NAMA_BULAN_FULL[startDate.getMonth()]} ${startDate.getFullYear()}`;
  const endStrFull = `${endDate.getDate()} ${NAMA_BULAN_FULL[endDate.getMonth()]} ${endDate.getFullYear()}`;
  const rangeDateText = `${startStrFull} - ${endStrFull}`;

  // --- ROW 3: Nama & Periode ---
  const row3 = worksheet.getRow(3);
  row3.getCell(1).value = "Nama";
  row3.getCell(1).font = { name: "Calibri", bold: true, size: 10 };
  row3.getCell(2).value = `: ${nama}`;
  row3.getCell(2).font = { name: "Calibri", size: 10 };
  row3.getCell(5).value = "Periode";
  row3.getCell(5).font = { name: "Calibri", bold: true, size: 10 };
  row3.getCell(6).value = `: ${periodeText || "-"}`;
  row3.getCell(6).font = { name: "Calibri", size: 10 };
  row3.height = 18;

  // --- ROW 4: Jabatan ---
  const row4 = worksheet.getRow(4);
  row4.getCell(1).value = "Jabatan";
  row4.getCell(1).font = { name: "Calibri", bold: true, size: 10 };
  row4.getCell(2).value = `: ${jabatan}`;
  row4.getCell(2).font = { name: "Calibri", size: 10 };
  row4.height = 18;

  // --- ROW 5: Nama Perusahaan & Periode Tanggal ---
  const row5 = worksheet.getRow(5);
  row5.getCell(1).value = "Nama Perusahaan";
  row5.getCell(1).font = { name: "Calibri", bold: true, size: 10 };
  row5.getCell(2).value = `: ${namaPerusahaan}`;
  row5.getCell(2).font = { name: "Calibri", size: 10 };
  row5.getCell(5).value = rangeDateText;
  row5.getCell(5).font = { name: "Calibri", bold: true, size: 10 };
  worksheet.mergeCells("E5:F5");
  row5.height = 18;

  // --- ROW 7 & 8: TABLE HEADERS ---
  // Background Header Blue: ARGB FF366092 atau FF2E75B6
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF3572C6" }, // Warna Biru Elegan
  };

  const headerFont: Partial<ExcelJS.Font> = {
    name: "Calibri",
    size: 10,
    bold: true,
    color: { argb: "FFFFFFFF" }, // Teks Putih
  };

  worksheet.mergeCells("A7:A8");
  const hHari = worksheet.getCell("A7");
  hHari.value = "Hari";
  hHari.font = headerFont;
  hHari.fill = headerFill;
  hHari.alignment = { horizontal: "center", vertical: "middle" };
  hHari.border = thinBorder;

  worksheet.mergeCells("B7:B8");
  const hTgl = worksheet.getCell("B7");
  hTgl.value = "Tanggal";
  hTgl.font = headerFont;
  hTgl.fill = headerFill;
  hTgl.alignment = { horizontal: "center", vertical: "middle" };
  hTgl.border = thinBorder;

  worksheet.mergeCells("C7:D7");
  const hAbsen = worksheet.getCell("C7");
  hAbsen.value = "Absen";
  hAbsen.font = headerFont;
  hAbsen.fill = headerFill;
  hAbsen.alignment = { horizontal: "center", vertical: "middle" };
  hAbsen.border = thinBorder;

  const hMasuk = worksheet.getCell("C8");
  hMasuk.value = "Masuk";
  hMasuk.font = headerFont;
  hMasuk.fill = headerFill;
  hMasuk.alignment = { horizontal: "center", vertical: "middle" };
  hMasuk.border = thinBorder;

  const hPulang = worksheet.getCell("D8");
  hPulang.value = "Pulang";
  hPulang.font = headerFont;
  hPulang.fill = headerFill;
  hPulang.alignment = { horizontal: "center", vertical: "middle" };
  hPulang.border = thinBorder;

  worksheet.mergeCells("E7:E8");
  const hJam = worksheet.getCell("E7");
  hJam.value = "Jumlah\nJam Kerja";
  hJam.font = headerFont;
  hJam.fill = headerFill;
  hJam.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  hJam.border = thinBorder;

  worksheet.mergeCells("F7:F8");
  const hLokasi = worksheet.getCell("F7");
  hLokasi.value = "Lokasi Absensi";
  hLokasi.font = headerFont;
  hLokasi.fill = headerFill;
  hLokasi.alignment = { horizontal: "center", vertical: "middle" };
  hLokasi.border = thinBorder;

  // Set header border for bottom merge cells
  worksheet.getCell("A8").border = thinBorder;
  worksheet.getCell("B8").border = thinBorder;
  worksheet.getCell("D7").border = thinBorder;
  worksheet.getCell("E8").border = thinBorder;
  worksheet.getCell("F8").border = thinBorder;

  worksheet.getRow(7).height = 20;
  worksheet.getRow(8).height = 20;

  // --- MENGELOMPOKKAN LOGS BERDASARKAN TANGGAL STRING ---
  const logsByDateStr: Record<
    string,
    { masuk?: AbsensiLogItem; pulang?: AbsensiLogItem; visit?: AbsensiLogItem[] }
  > = {};

  logs.forEach((log) => {
    const d = log.waktuObj;
    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    if (!logsByDateStr[dateKey]) {
      logsByDateStr[dateKey] = { visit: [] };
    }

    if (log.tipe_absen === "Absen Masuk") {
      logsByDateStr[dateKey].masuk = log;
    } else if (log.tipe_absen === "Absen Pulang") {
      logsByDateStr[dateKey].pulang = log;
    } else if (log.tipe_absen.includes("Visit")) {
      logsByDateStr[dateKey].visit?.push(log);
    }
  });

  // --- GENERATE BARIS DATA HARI DEMI HARI ---
  const pinkFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFF3399" }, // Warna Pink / Magenta terang seperti template gambar!
  };

  let currentRowIdx = 9;
  const curDate = new Date(startDate);
  // Normalisasi waktu jam ke 00:00:00
  curDate.setHours(0, 0, 0, 0);

  const endLimit = new Date(endDate);
  endLimit.setHours(23, 59, 59, 999);

  while (curDate <= endLimit) {
    const dayOfWeek = curDate.getDay(); // 0 = Minggu, 6 = Sabtu
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const dayName = NAMA_HARI[dayOfWeek];
    const dateFormatted = `${curDate.getDate()}-${NAMA_BULAN_SHORT[curDate.getMonth()]}-${curDate.getFullYear()}`;

    const dateKey = `${curDate.getFullYear()}-${String(curDate.getMonth() + 1).padStart(2, "0")}-${String(curDate.getDate()).padStart(2, "0")}`;
    const dayLog = logsByDateStr[dateKey];

    const row = worksheet.getRow(currentRowIdx);
    row.height = 19;

    // Kolom A: Hari
    const cellA = row.getCell(1);
    cellA.value = dayName;
    cellA.alignment = { horizontal: "left", vertical: "middle" };
    cellA.font = { name: "Calibri", size: 10, bold: isWeekend };
    cellA.border = thinBorder;

    // Kolom B: Tanggal
    const cellB = row.getCell(2);
    cellB.value = dateFormatted;
    cellB.alignment = { horizontal: "left", vertical: "middle" };
    cellB.font = { name: "Calibri", size: 10 };
    cellB.border = thinBorder;

    const cellC = row.getCell(3); // Masuk
    const cellD = row.getCell(4); // Pulang
    const cellE = row.getCell(5); // Jam Kerja
    const cellF = row.getCell(6); // Lokasi

    [cellC, cellD, cellE, cellF].forEach((c) => {
      c.border = thinBorder;
      c.font = { name: "Calibri", size: 10 };
    });

    if (isWeekend) {
      // Baris Weekend (Sabtu / Minggu) diberi warna Pink di kolom C - F
      cellC.fill = pinkFill;
      cellD.fill = pinkFill;
      cellE.fill = pinkFill;
      cellF.fill = pinkFill;

      // Jika ada log di hari libur, tetap tampilkan
      if (dayLog?.masuk) {
        cellC.value = formatTimeShort(dayLog.masuk.waktuObj);
        cellC.alignment = { horizontal: "center", vertical: "middle" };
      }
      if (dayLog?.pulang) {
        cellD.value = formatTimeShort(dayLog.pulang.waktuObj);
        cellD.alignment = { horizontal: "center", vertical: "middle" };
      }
      if (dayLog?.masuk && dayLog?.pulang) {
        cellE.value = calcDiffTime(dayLog.masuk.waktuObj, dayLog.pulang.waktuObj);
        cellE.alignment = { horizontal: "center", vertical: "middle" };
      }
      if (dayLog?.masuk?.lokasi && dayLog.masuk.lokasi !== "Tanpa GPS") {
        cellF.value = dayLog.masuk.lokasi;
        cellF.alignment = { horizontal: "left", vertical: "middle" };
      }
    } else {
      // Hari Kerja (Senin - Jumat)
      let masukStr = "";
      let pulangStr = "";
      let diffStr = "";
      let lokasiStr = "";

      if (dayLog?.masuk) {
        masukStr = formatTimeShort(dayLog.masuk.waktuObj);
        lokasiStr = dayLog.masuk.lokasi && dayLog.masuk.lokasi !== "Tanpa GPS" ? dayLog.masuk.lokasi : "";
      }

      if (dayLog?.pulang) {
        pulangStr = formatTimeShort(dayLog.pulang.waktuObj);
        if (!lokasiStr && dayLog.pulang.lokasi && dayLog.pulang.lokasi !== "Tanpa GPS") {
          lokasiStr = dayLog.pulang.lokasi;
        }
      }

      if (dayLog?.masuk && dayLog?.pulang) {
        diffStr = calcDiffTime(dayLog.masuk.waktuObj, dayLog.pulang.waktuObj);
      }

      cellC.value = masukStr || "";
      cellC.alignment = { horizontal: "center", vertical: "middle" };

      cellD.value = pulangStr || "";
      cellD.alignment = { horizontal: "center", vertical: "middle" };

      cellE.value = diffStr || "";
      cellE.alignment = { horizontal: "center", vertical: "middle" };

      cellF.value = lokasiStr || "";
      cellF.alignment = { horizontal: "left", vertical: "middle" };
    }

    currentRowIdx++;
    curDate.setDate(curDate.getDate() + 1);
  }

  // Generate buffer and trigger browser download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const cleanName = (nama || "Karyawan").replace(/[^a-zA-Z0-9]/g, "_");
  const cleanPeriode = (periodeText || "Periode").replace(/[^a-zA-Z0-9]/g, "_");
  const fileName = `Laporan_Absensi_${cleanName}_${cleanPeriode}.xlsx`;

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(linkSafe(anchor));
};

const formatTimeShort = (date: Date): string => {
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

const calcDiffTime = (start: Date, end: Date): string => {
  let diffMs = end.getTime() - start.getTime();
  if (diffMs < 0) return "-";
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}:${String(mins).padStart(2, "0")}`;
};

const linkSafe = (el: HTMLElement) => el;

