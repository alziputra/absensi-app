"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import {
  logoutUser,
  getAllUserProfiles,
  approveAndSendPasswordReset,
  updateUserRole,
} from "@/services/authService";
import { getAllEmployeeLogsForAdmin } from "@/services/reportService";
import { formatDateID, formatTimeID } from "@/utils/formatters";
import { KANWIL_OPTIONS } from "@/config/constants";
import { AbsensiLogItem, UserProfile, TipeAbsen } from "@/types";
import AlertModal, { AlertType } from "@/components/ui/AlertModal";
import ExportReportModal from "@/components/absensi/ExportReportModal";

export default function AdminPanelView() {
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const [logs, setLogs] = useState<AbsensiLogItem[]>([]);
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const router = useRouter();

  // Active Admin Tab
  const [activeTab, setActiveTab] = useState<"logs" | "users">("logs");

  // Filters State
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [filterKanwil, setFilterKanwil] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterDate, setFilterDate] = useState<string>("");

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(25);

  // Photo Preview Modal
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);

  // Alert Modal State
  const [alertConfig, setAlertConfig] = useState<{
    isOpen: boolean;
    type: AlertType;
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: "info",
    title: "",
    message: "",
  });

  const showAlert = (type: AlertType, title: string, message: string) => {
    setAlertConfig({ isOpen: true, type, title, message });
  };

  const closeAlert = () => {
    setAlertConfig((prev) => ({ ...prev, isOpen: false }));
  };

  useEffect(() => {
    if (!authLoading && user) {
      if (isAdmin) {
        fetchAdminData();
      }
    }
  }, [authLoading, user, isAdmin]);

  const fetchAdminData = async () => {
    setIsLoading(true);
    try {
      const [logsData, usersData] = await Promise.all([
        getAllEmployeeLogsForAdmin(),
        getAllUserProfiles(),
      ]);
      setLogs(logsData);
      setUserProfiles(usersData);
    } catch (error) {
      console.error("Gagal mengambil data admin:", error);
      showAlert(
        "error",
        "Gagal Memuat Data",
        "Terjadi kendala saat menghubungkan ke database server."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      router.push("/");
    } catch (error) {
      console.error("Gagal logout:", error);
    }
  };

  // --- STATISTIK CEPAT (KPI SUMMARY) ---
  const todayStr = new Date().toDateString();

  const stats = useMemo(() => {
    const todayLogs = logs.filter(
      (l) => l.waktuObj.toDateString() === todayStr
    );

    const todayMasuk = todayLogs.filter((l) => l.tipe_absen === "Absen Masuk");
    const todayLate = todayMasuk.filter(
      (l) => l.status_kehadiran === "Terlambat"
    );
    const todayVisit = todayLogs.filter((l) =>
      l.tipe_absen.includes("Visit")
    );

    return {
      totalEmployees: userProfiles.length,
      todayMasukCount: todayMasuk.length,
      todayLateCount: todayLate.length,
      todayVisitCount: todayVisit.length,
      totalLogs: logs.length,
    };
  }, [logs, userProfiles, todayStr]);

  // --- FILTERING DATA LOGS ---
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const searchLower = searchTerm.toLowerCase();
      const matchSearch =
        (log.nama || "").toLowerCase().includes(searchLower) ||
        (log.email || "").toLowerCase().includes(searchLower) ||
        (log.cabang || "").toLowerCase().includes(searchLower) ||
        (log.kanwil || "").toLowerCase().includes(searchLower) ||
        (log.userId || "").toLowerCase().includes(searchLower);

      const matchType =
        filterType === "ALL" || log.tipe_absen === filterType;

      const matchKanwil =
        filterKanwil === "ALL" || log.kanwil === filterKanwil;

      const matchStatus =
        filterStatus === "ALL" ||
        (filterStatus === "Terlambat" &&
          log.status_kehadiran === "Terlambat") ||
        (filterStatus === "Tepat Waktu" &&
          log.status_kehadiran === "Tepat Waktu");

      const matchDate =
        !filterDate ||
        formatDateID(log.waktuObj).replace(/\//g, "-") === filterDate ||
        log.waktuObj.toISOString().slice(0, 10) === filterDate;

      return matchSearch && matchType && matchKanwil && matchStatus && matchDate;
    });
  }, [logs, searchTerm, filterType, filterKanwil, filterStatus, filterDate]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType, filterKanwil, filterStatus, filterDate, itemsPerPage]);

  // --- PAGINATION DATA ---
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage) || 1;
  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredLogs, currentPage, itemsPerPage]);

  // --- FILTER USER DIRECTORY ---
  const filteredUsers = useMemo(() => {
    return userProfiles.filter((u) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        (u.displayName || "").toLowerCase().includes(searchLower) ||
        (u.email || "").toLowerCase().includes(searchLower) ||
        (u.kanwil || "").toLowerCase().includes(searchLower) ||
        (u.role || "").toLowerCase().includes(searchLower)
      );
    });
  }, [userProfiles, searchTerm]);

  // --- EKSPOR MASTER CSV DARI HASIL FILTER ---
  const handleExportFilteredCSV = () => {
    if (filteredLogs.length === 0) {
      showAlert(
        "warning",
        "Data Kosong",
        "Tidak ada data log yang cocok untuk diekspor."
      );
      return;
    }

    const headers = [
      "Waktu",
      "Tanggal",
      "UID User",
      "Nama Karyawan",
      "Email",
      "Kanwil",
      "Role",
      "Tipe Absen",
      "Status Kehadiran",
      "Keterlambatan",
      "Cabang",
      "Lokasi GPS",
      "Link Foto",
    ];

    const rows = filteredLogs.map((log) => [
      `"${formatTimeID(log.waktuObj)}"`,
      `"${formatDateID(log.waktuObj)}"`,
      `"${log.userId}"`,
      `"${log.nama || "-"}"`,
      `"${log.email || "-"}"`,
      `"${log.kanwil || "-"}"`,
      `"${log.role || "-"}"`,
      `"${log.tipe_absen}"`,
      `"${log.status_kehadiran || "-"}"`,
      `"${log.detail_keterlambatan || "-"}"`,
      `"${log.cabang || "-"}"`,
      `"${log.lokasi || "Tanpa GPS"}"`,
      `"${log.foto_url || "-"}"`,
    ]);

    const csvContent =
      "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Master_Rekap_Admin_${formatDateID(new Date())}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showAlert(
      "success",
      "Ekspor Berhasil",
      `Berhasil mengekspor ${filteredLogs.length} data rekapan log ke file CSV.`
    );
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setFilterType("ALL");
    setFilterKanwil("ALL");
    setFilterStatus("ALL");
    setFilterDate("");
  };

  // --- KIRIM LINK RESET PASSWORD KE KARYAWAN (APPROVAL) ---
  const handleSendPasswordReset = async (
    uid: string,
    userEmail: string,
    userName: string
  ) => {
    if (!userEmail) {
      showAlert(
        "error",
        "Email Tidak Ditemukan",
        "Karyawan ini tidak memiliki alamat email yang valid."
      );
      return;
    }

    try {
      await approveAndSendPasswordReset(uid, userEmail.trim());
      
      // Update local state agar status resetRequested langsung hilang dari tabel
      setUserProfiles((prev) =>
        prev.map((u) => (u.uid === uid ? { ...u, resetRequested: false } : u))
      );

      showAlert(
        "success",
        "Tautan Reset Terkirim!",
        `Permintaan reset disetujui! Tautan pembuatan kata sandi baru telah berhasil dikirimkan ke email: ${userEmail} (${userName || "Karyawan"}).\n\nKaryawan dapat membuka emailnya untuk memperbarui kata sandi.`
      );
    } catch (error: any) {
      console.error("Gagal mengirim reset password:", error);
      showAlert(
        "error",
        "Gagal Mengirim Email",
        `Terjadi kendala: ${error.message || "Pastikan email valid."}`
      );
    }
  };

  // --- UBAH ROLE USER (admin / user) ---
  const handleRoleChange = async (
    uid: string,
    newRole: "admin" | "user",
    userName: string
  ) => {
    try {
      await updateUserRole(uid, newRole);
      setUserProfiles((prev) =>
        prev.map((u) => (u.uid === uid ? { ...u, role: newRole } : u))
      );
      showAlert(
        "success",
        "Role Berhasil Diperbarui",
        `Role akun ${userName || "Karyawan"} berhasil diubah menjadi "${newRole.toUpperCase()}".`
      );
    } catch (error: any) {
      console.error("Gagal mengubah role:", error);
      showAlert(
        "error",
        "Gagal Mengubah Role",
        `Terjadi kendala: ${error.message || "Gagal memperbarui database."}`
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 font-sans pb-20">
      {/* ALERT MODAL */}
      <AlertModal
        isOpen={alertConfig.isOpen}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        onClose={closeAlert}
      />

      {/* EXPORT EXCEL MODAL (.xlsx) */}
      <ExportReportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        logs={filteredLogs}
        defaultUserName="Super Admin"
      />

      {/* PHOTO PREVIEW MODAL */}
      {previewPhotoUrl && (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={() => setPreviewPhotoUrl(null)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-3xl p-4 max-w-lg w-full overflow-hidden shadow-2xl relative animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-3 px-2">
              <span className="font-semibold text-sm text-slate-200">
                Bukti Foto Visit
              </span>
              <button
                onClick={() => setPreviewPhotoUrl(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="w-full h-80 relative rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center">
              <img
                src={previewPhotoUrl}
                alt="Bukti Visit"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="mt-4 flex justify-end">
              <a
                href={previewPhotoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl font-medium transition"
              >
                Buka Ukuran Asli ↗
              </a>
            </div>
          </div>
        </div>
      )}

      {/* UNAUTHORIZED ACCESS MODAL */}
      {!authLoading && !isAdmin && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-4 bg-black/85 backdrop-blur-md">
          <div className="bg-slate-900 border border-red-500/40 rounded-3xl shadow-2xl p-8 text-center max-w-sm animate-bounce">
            <div className="text-6xl mb-4">👮‍♂️🛑</div>
            <h3 className="text-2xl font-black text-rose-500 mb-2">
              Eits, Mau Kemana Bos? ✋😂
            </h3>
            <p className="text-slate-300 font-medium text-sm mb-6 leading-relaxed">
              Nakal yeee!! Lu bukan Super Admin, jangan coba-coba ngintip sembarangan bro! 
              <br />
              <span className="text-amber-400 font-semibold block mt-2">
                Sungkem dulu ke Bang Alzi kalau mau minta akses! ☕😎
              </span>
            </p>
            <button
              onClick={() => router.push("/dashboard")}
              className="w-full bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white py-3.5 rounded-2xl font-bold transition-all cursor-pointer shadow-lg shadow-rose-600/30 active:scale-95 text-sm"
            >
              Balik ke Jalan yang Benar 🏃‍♂️💨
            </button>
          </div>
        </div>
      )}

      {/* TOP HEADER */}
      <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <span className="text-xl">🛡️</span>
            </div>
            <div>
              <h1 className="font-bold text-lg text-white leading-tight">
                Super Admin Center
              </h1>
              <p className="text-xs text-slate-400">
                Sistem Monitoring Absensi & Visit Pegadaian
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchAdminData}
              disabled={isLoading}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer border border-slate-700"
              title="Muat ulang data terbaru"
            >
              <span className={isLoading ? "animate-spin" : ""}>🔄</span>
              <span>Segarkan</span>
            </button>

            <Link
              href="/dashboard"
              className="text-xs bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 px-3.5 py-2 rounded-xl font-medium transition"
            >
              Dashboard Pegawai →
            </Link>

            <button
              onClick={handleLogout}
              className="text-xs bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 px-3.5 py-2 rounded-xl font-medium transition cursor-pointer"
            >
              Keluar
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-8">
        {/* KPI SUMMARY CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {/* Total Karyawan */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg relative overflow-hidden">
            <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">
              Total Karyawan
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {stats.totalEmployees}
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              <span>Akun terdaftar</span>
            </div>
          </div>

          {/* Absen Masuk Hari Ini */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg relative overflow-hidden">
            <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">
              Absen Masuk Hari Ini
            </div>
            <div className="text-3xl font-bold text-emerald-400 mb-1">
              {stats.todayMasukCount}
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>{stats.todayLateCount} Terlambat</span>
            </div>
          </div>

          {/* Visit Hari Ini */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg relative overflow-hidden">
            <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">
              Aktivitas Visit Hari Ini
            </div>
            <div className="text-3xl font-bold text-amber-400 mb-1">
              {stats.todayVisitCount}
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Kunjungan Outlet</span>
            </div>
          </div>

          {/* Total Seluruh Log */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg relative overflow-hidden">
            <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">
              Total Database Log
            </div>
            <div className="text-3xl font-bold text-indigo-400 mb-1">
              {stats.totalLogs}
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-indigo-400" />
              <span>Rekaman tersimpan</span>
            </div>
          </div>
        </div>

        {/* TABS SELECTOR */}
        <div className="flex items-center gap-3 border-b border-slate-800 mb-6 pb-2">
          <button
            onClick={() => setActiveTab("logs")}
            className={`px-5 py-2.5 rounded-2xl text-sm font-semibold transition cursor-pointer flex items-center gap-2 ${
              activeTab === "logs"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <span>📋</span>
            <span>Rekap Aktivitas Absensi ({filteredLogs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("users")}
            className={`px-5 py-2.5 rounded-2xl text-sm font-semibold transition cursor-pointer flex items-center gap-2 ${
              activeTab === "users"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <span>👥</span>
            <span>Direktori Karyawan ({filteredUsers.length})</span>
            {userProfiles.filter((u) => u.resetRequested).length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px] animate-pulse">
                {userProfiles.filter((u) => u.resetRequested).length} Permintaan Reset
              </span>
            )}
          </button>
        </div>

        {/* TAB 1: REKAP LOG ABSENSI */}
        {activeTab === "logs" && (
          <div className="space-y-4">
            {/* FILTER TOOLBAR */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
              <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4">
                {/* Search Box */}
                <div className="flex-1 relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                    🔍
                  </span>
                  <input
                    type="text"
                    placeholder="Cari nama karyawan, email, cabang, atau kanwil..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-500"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => setIsExportModalOpen(true)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-2xl text-xs font-semibold flex items-center gap-2 transition shadow-lg shadow-emerald-600/20 cursor-pointer active:scale-95"
                  >
                    <span>📊</span>
                    <span>Format Excel (.xlsx)</span>
                  </button>

                  <button
                    onClick={handleExportFilteredCSV}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3.5 py-2.5 rounded-2xl text-xs font-medium border border-slate-700 transition cursor-pointer"
                    title="Unduh seluruh data hasil filter ke CSV biasa"
                  >
                    Ekspor CSV
                  </button>

                  <button
                    onClick={handleResetFilters}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3.5 py-2.5 rounded-2xl text-xs font-medium border border-slate-700 transition cursor-pointer"
                    title="Reset semua filter"
                  >
                    Reset Filter
                  </button>
                </div>
              </div>

              {/* Multi-Filters Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-slate-800/80 text-xs">
                {/* Filter Tipe Absen */}
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    Tipe Absen / Visit
                  </label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="ALL">Semua Tipe</option>
                    <option value="Absen Masuk">Absen Masuk</option>
                    <option value="Absen Pulang">Absen Pulang</option>
                    <option value="Visit Masuk">Visit Masuk</option>
                    <option value="Visit Keluar">Visit Keluar</option>
                  </select>
                </div>

                {/* Filter Kanwil */}
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    Kantor Wilayah (Kanwil)
                  </label>
                  <select
                    value={filterKanwil}
                    onChange={(e) => setFilterKanwil(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="ALL">Semua Kanwil</option>
                    {KANWIL_OPTIONS.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filter Status Kehadiran */}
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    Status Kehadiran
                  </label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="ALL">Semua Status</option>
                    <option value="Tepat Waktu">Tepat Waktu</option>
                    <option value="Terlambat">Terlambat</option>
                  </select>
                </div>

                {/* Filter Tanggal Spesifik */}
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    Pilih Tanggal
                  </label>
                  <input
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* TABLE CONTAINER */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                {isLoading || authLoading ? (
                  <div className="p-20 text-center flex flex-col items-center">
                    <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4" />
                    <p className="text-slate-400 text-sm font-medium">
                      Memuat data aktivitas seluruh karyawan...
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse min-w-[950px]">
                    <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider font-semibold">
                      <tr>
                        <th className="p-4 pl-6">Waktu & Tanggal ↓</th>
                        <th className="p-4">Identitas Karyawan</th>
                        <th className="p-4">Tipe & Status</th>
                        <th className="p-4">Cabang / Lokasi GPS</th>
                        <th className="p-4 text-center pr-6">Bukti Foto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-sm">
                      {paginatedLogs.length > 0 ? (
                        paginatedLogs.map((log) => {
                          const tgl = formatDateID(log.waktuObj, {
                            shortMonth: true,
                          });
                          const jam = formatTimeID(log.waktuObj);

                          return (
                            <tr
                              key={log.id}
                              className="hover:bg-slate-800/40 transition-colors"
                            >
                              {/* WAKTU & TANGGAL */}
                              <td className="p-4 pl-6">
                                <div className="font-bold text-white text-base">
                                  {jam}
                                </div>
                                <div className="text-xs text-slate-400 mt-0.5">
                                  {tgl}
                                </div>
                              </td>

                              {/* IDENTITAS */}
                              <td className="p-4">
                                <div className="font-semibold text-slate-100">
                                  {log.nama || "User"}
                                </div>
                                <div className="text-xs text-slate-400">
                                  {log.email || log.userId}
                                </div>
                                {log.kanwil && log.kanwil !== "-" && (
                                  <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px] border border-slate-700">
                                    {log.kanwil}
                                  </span>
                                )}
                              </td>

                              {/* TIPE & STATUS */}
                              <td className="p-4">
                                <div className="font-semibold text-blue-400">
                                  {log.tipe_absen}
                                </div>
                                {log.status_kehadiran &&
                                  log.status_kehadiran !== "-" && (
                                    <span
                                      className={`inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                        log.status_kehadiran === "Terlambat"
                                          ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                          : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                      }`}
                                    >
                                      {log.status_kehadiran}
                                      {log.detail_keterlambatan &&
                                        log.detail_keterlambatan !== "-" &&
                                        ` (${log.detail_keterlambatan})`}
                                    </span>
                                  )}
                              </td>

                              {/* CABANG & LOKASI */}
                              <td className="p-4">
                                {log.cabang && log.cabang !== "-" && (
                                  <div className="font-semibold text-slate-200 mb-1 flex items-center gap-1">
                                    <span>📍</span>
                                    <span>{log.cabang}</span>
                                  </div>
                                )}
                                {log.lokasi &&
                                !log.lokasi.includes("Tanpa") &&
                                !log.lokasi.includes("Gagal") ? (
                                  <a
                                    href={`https://maps.google.com/?q=${log.lokasi}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1"
                                  >
                                    <span>Lihat Map GPS ({log.lokasi})</span>
                                    <span>↗</span>
                                  </a>
                                ) : (
                                  <span className="text-xs text-slate-500">
                                    Tanpa GPS
                                  </span>
                                )}
                              </td>

                              {/* BUKTI FOTO */}
                              <td className="p-4 pr-6 text-center">
                                {log.foto_url && log.foto_url !== "-" ? (
                                  <button
                                    onClick={() =>
                                      setPreviewPhotoUrl(log.foto_url)
                                    }
                                    className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer"
                                  >
                                    Lihat Foto
                                  </button>
                                ) : (
                                  <span className="text-xs text-slate-500 italic">
                                    -
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td
                            colSpan={5}
                            className="p-16 text-center text-slate-400"
                          >
                            <div className="text-4xl mb-3">🔍</div>
                            <div className="text-base font-semibold text-slate-300">
                              Tidak ada data ditemukan
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                              Coba ubah kata kunci pencarian atau sesuaikan
                              filter di atas.
                            </p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>

              {/* PAGINATION CONTROLS */}
              <div className="bg-slate-950/60 border-t border-slate-800 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-400">
                <div className="flex items-center gap-3">
                  <span>Tampilkan per halaman:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                    className="bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-200 focus:outline-none cursor-pointer"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span>
                    Menampilkan{" "}
                    <strong className="text-white">
                      {filteredLogs.length === 0
                        ? 0
                        : (currentPage - 1) * itemsPerPage + 1}
                    </strong>{" "}
                    -{" "}
                    <strong className="text-white">
                      {Math.min(
                        currentPage * itemsPerPage,
                        filteredLogs.length
                      )}
                    </strong>{" "}
                    dari{" "}
                    <strong className="text-white">
                      {filteredLogs.length}
                    </strong>{" "}
                    total data
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(prev - 1, 1))
                    }
                    disabled={currentPage === 1}
                    className={`px-3 py-1.5 rounded-xl border border-slate-700 transition cursor-pointer ${
                      currentPage === 1
                        ? "opacity-40 cursor-not-allowed"
                        : "bg-slate-800 hover:bg-slate-700 text-white"
                    }`}
                  >
                    ← Sebelumnya
                  </button>

                  <span className="px-3 py-1.5 font-semibold text-slate-300">
                    Halaman {currentPage} dari {totalPages}
                  </span>

                  <button
                    onClick={() =>
                      setCurrentPage((prev) =>
                        Math.min(prev + 1, totalPages)
                      )
                    }
                    disabled={currentPage === totalPages || totalPages === 0}
                    className={`px-3 py-1.5 rounded-xl border border-slate-700 transition cursor-pointer ${
                      currentPage === totalPages || totalPages === 0
                        ? "opacity-40 cursor-not-allowed"
                        : "bg-slate-800 hover:bg-slate-700 text-white"
                    }`}
                  >
                    Selanjutnya →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DIREKTORI KARYAWAN */}
        {activeTab === "users" && (
          <div className="space-y-4">
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex-1 w-full relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                  🔍
                </span>
                <input
                  type="text"
                  placeholder="Cari nama, email, kanwil, atau role karyawan..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 rounded-2xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-500"
                />
              </div>
              <div className="text-xs text-slate-400 whitespace-nowrap">
                Total Karyawan Terdaftar:{" "}
                <strong className="text-white text-sm">
                  {filteredUsers.length}
                </strong>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[750px]">
                  <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="p-4 pl-6">Nama Karyawan</th>
                      <th className="p-4">Email</th>
                      <th className="p-4">Kantor Wilayah (Kanwil)</th>
                      <th className="p-4">Role / Jabatan</th>
                      <th className="p-4 text-center">UID User</th>
                      <th className="p-4 text-center pr-6">Aksi Kelola</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-sm">
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map((u) => {
                        const isRequested = Boolean(u.resetRequested);

                        return (
                          <tr
                            key={u.uid}
                            className={`transition-colors ${
                              isRequested
                                ? "bg-amber-500/10 border-l-4 border-amber-500 hover:bg-amber-500/15"
                                : "hover:bg-slate-800/40"
                            }`}
                          >
                            <td className="p-4 pl-6">
                              <div className="font-semibold text-white flex items-center gap-2">
                                <span>{u.displayName || "Karyawan"}</span>
                                {isRequested && (
                                  <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold uppercase">
                                    Meminta Reset
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-4 text-slate-300">{u.email}</td>
                            <td className="p-4">
                              <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs border border-slate-700">
                                {u.kanwil || "Kanwil XII - Surabaya"}
                              </span>
                            </td>
                            <td className="p-4">
                              <select
                                value={
                                  (u.role || "user").toLowerCase() === "admin" ||
                                  (u.role || "").toLowerCase() === "super admin"
                                    ? "admin"
                                    : "user"
                                }
                                onChange={(e) =>
                                  handleRoleChange(
                                    u.uid,
                                    e.target.value as "admin" | "user",
                                    u.displayName
                                  )
                                }
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer focus:outline-none shadow-sm ${
                                  (u.role || "user").toLowerCase() === "admin" ||
                                  (u.role || "").toLowerCase() === "super admin"
                                    ? "bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30"
                                    : "bg-slate-800 text-blue-400 border-slate-700 hover:border-slate-600"
                                }`}
                              >
                                <option
                                  value="user"
                                  className="bg-slate-900 text-slate-300 font-medium"
                                >
                                  user
                                </option>
                                <option
                                  value="admin"
                                  className="bg-slate-900 text-rose-300 font-bold"
                                >
                                  admin
                                </option>
                              </select>
                            </td>
                            <td className="p-4 text-center text-xs font-mono text-slate-500">
                              {u.uid}
                            </td>
                            <td className="p-4 pr-6 text-center">
                              {isRequested ? (
                                <button
                                  onClick={() =>
                                    handleSendPasswordReset(
                                      u.uid,
                                      u.email,
                                      u.displayName
                                    )
                                  }
                                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-amber-500/30 active:scale-95 animate-bounce mx-auto"
                                  title={`Klik untuk kirim link reset password resmi ke ${u.email}`}
                                >
                                  <span>🔑</span>
                                  <span>Kirim Link Reset</span>
                                </button>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  <span>Normal</span>
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td
                          colSpan={6}
                          className="p-16 text-center text-slate-400"
                        >
                          Tidak ada karyawan yang cocok dengan pencarian.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
