"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { getUserAbsensiLogs } from "@/services/reportService";
import { formatDateID, formatTimeID } from "@/utils/formatters";
import { AbsensiLogItem } from "@/types";
import SidebarMenu from "@/components/layout/SidebarMenu";
import AlertModal, { AlertType } from "@/components/ui/AlertModal";
import ExportReportModal from "@/components/absensi/ExportReportModal";

export default function DataAbsensiView() {
  const { user, profile, isLoading: authLoading } = useAuth();
  const [logs, setLogs] = useState<AbsensiLogItem[]>([]);
  const [activeTab, setActiveTab] = useState<"Absen Masuk" | "Absen Pulang">("Absen Masuk");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);

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
    if (user) {
      loadData(user.uid);
    }
  }, [user]);

  const loadData = async (userId: string) => {
    setIsLoading(true);
    try {
      const data = await getUserAbsensiLogs(userId);
      setLogs(data);
    } catch (error) {
      console.error("Gagal mengambil data absensi:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredLogs = logs.filter((log) => log.tipe_absen === activeTab);

  return (
    <div className="min-h-screen bg-gray-50 font-sans relative overflow-x-hidden pb-20">
      {/* Alert Modal */}
      <AlertModal
        isOpen={alertConfig.isOpen}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        onClose={closeAlert}
      />

      {/* Export Report Modal (.xlsx) */}
      <ExportReportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        logs={logs}
        userProfile={profile}
        defaultUserName={user?.displayName || ""}
      />

      {/* Header */}
      <header className="bg-[#050B20] text-white p-4 flex justify-between items-center relative z-20">
        <Link
          href="/dashboard"
          className="font-bold text-xl flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
        >
          <span className="text-blue-400">⚡</span> AppAbsensi
        </Link>
        <button
          onClick={() => setIsMenuOpen(true)}
          className="bg-white text-black px-3 py-1 rounded cursor-pointer hover:bg-gray-200 transition"
        >
          ☰
        </button>
      </header>

      {/* Sidebar Drawer */}
      <SidebarMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        currentPath="/data-absensi"
      />

      <main className="max-w-6xl mx-auto p-6 relative z-10">
        {/* Title & Export */}
        <div className="flex flex-col sm:flex-row justify-between items-center my-8 gap-4">
          <div>
            <h1 className="text-3xl font-light text-gray-800">Data Absensi</h1>
            <p className="text-gray-500 text-xs mt-1">
              Riwayat rekaman absensi kehadiran dan jam kerja Anda
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/klaim-absensi"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 text-sm transition-all shadow-md hover:shadow-lg shadow-blue-600/20 cursor-pointer active:scale-95"
            >
              <span>📝</span>
              <span>Klaim Lupa Absen</span>
            </Link>

            <button
              onClick={() => setIsExportModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 text-sm transition-all shadow-md hover:shadow-lg shadow-emerald-600/20 cursor-pointer active:scale-95"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              <span>Export Excel (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* Tab & Table */}
        <div className="bg-white shadow-sm border border-gray-200 rounded-2xl overflow-hidden">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab("Absen Masuk")}
              className={`flex-1 py-4 text-sm font-semibold transition-colors cursor-pointer ${
                activeTab === "Absen Masuk"
                  ? "bg-[#050B20] text-white"
                  : "bg-white text-gray-600 hover:bg-gray-100"
              }`}
            >
              Absensi Masuk
            </button>
            <button
              onClick={() => setActiveTab("Absen Pulang")}
              className={`flex-1 py-4 text-sm font-semibold transition-colors cursor-pointer ${
                activeTab === "Absen Pulang"
                  ? "bg-[#050B20] text-white"
                  : "bg-white text-gray-600 hover:bg-gray-100"
              }`}
            >
              Absensi Pulang
            </button>
          </div>

          <div className="overflow-x-auto">
            {isLoading || authLoading ? (
              <div className="p-10 text-center text-gray-500">
                <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-2" />
                Memuat data...
              </div>
            ) : (
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead className="bg-[#f8fcfc] border-b border-gray-200">
                  <tr>
                    <th className="p-4 font-semibold text-sm text-gray-700">Tanggal ↓</th>
                    <th className="p-4 font-semibold text-sm text-gray-700">Jam</th>
                    <th className="p-4 font-semibold text-sm text-gray-700">Status</th>
                    <th className="p-4 font-semibold text-sm text-gray-700">Keterlambatan</th>
                    <th className="p-4 font-semibold text-sm text-gray-700">Lokasi</th>
                    <th className="p-4 font-semibold text-sm text-gray-700">Bukti Foto</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.length > 0 ? (
                    filteredLogs.map((log) => {
                      const tgl = formatDateID(log.waktuObj);
                      const jam = formatTimeID(log.waktuObj);

                      return (
                        <tr
                          key={log.id}
                          className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                        >
                          <td className="p-4 text-sm text-gray-800">{tgl}</td>
                          <td className="p-4 text-sm text-gray-800 font-medium">{jam}</td>
                          <td className="p-4 text-sm text-gray-800">
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                log.status_kehadiran === "Terlambat"
                                  ? "bg-red-100 text-red-600"
                                  : "bg-green-100 text-green-600"
                              }`}
                            >
                              {log.status_kehadiran || "-"}
                            </span>
                          </td>
                          <td className="p-4 text-sm text-red-500 font-medium">
                            {log.detail_keterlambatan || "-"}
                          </td>
                          <td className="p-4 text-sm text-gray-800">
                            {log.lokasi && !log.lokasi.includes("Tanpa") && !log.lokasi.includes("Gagal") ? (
                              <a
                                href={`https://maps.google.com/?q=${log.lokasi}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:underline"
                              >
                                Lihat Map
                              </a>
                            ) : (
                              <span className="text-gray-400 text-xs">Tanpa GPS</span>
                            )}
                          </td>
                          <td className="p-4 text-sm">
                            {log.foto_url && log.foto_url !== "-" ? (
                              <a
                                href={log.foto_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 underline hover:text-blue-800"
                              >
                                Lihat Foto
                              </a>
                            ) : (
                              <span className="text-gray-400 text-xs">Tanpa Foto</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-gray-500">
                        Belum ada data {activeTab.toLowerCase()}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
