"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { getUserAbsensiLogs, exportVisitToCSV } from "@/services/reportService";
import { formatDateID, formatTimeID } from "@/utils/formatters";
import { AbsensiLogItem } from "@/types";
import SidebarMenu from "@/components/layout/SidebarMenu";
import AlertModal, { AlertType } from "@/components/ui/AlertModal";

export default function DataVisitView() {
  const { user, isLoading: authLoading } = useAuth();
  const [logs, setLogs] = useState<AbsensiLogItem[]>([]);
  const [activeTab, setActiveTab] = useState<"Visit Masuk" | "Visit Keluar">("Visit Masuk");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);

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
      console.error("Gagal mengambil data visit:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = () => {
    const success = exportVisitToCSV(logs);
    if (!success) {
      showAlert(
        "warning",
        "Data Kosong",
        "Belum ada rekaman visit yang dapat diekspor ke Excel."
      );
    } else {
      showAlert(
        "success",
        "Ekspor Berhasil",
        "Laporan visit telah berhasil diunduh ke perangkat Anda."
      );
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
        currentPath="/data-visit"
      />

      <main className="max-w-6xl mx-auto p-6 relative z-10">
        {/* Title & Export */}
        <div className="flex flex-col sm:flex-row justify-between items-center my-8 gap-4">
          <h1 className="text-3xl font-light text-gray-800">Data Visit</h1>

          <button
            onClick={handleExport}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 text-sm transition-colors shadow-sm cursor-pointer active:scale-95"
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
            Export to Excel
          </button>
        </div>

        {/* Tab & Table */}
        <div className="bg-white shadow-sm border border-gray-200 rounded-2xl overflow-hidden">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab("Visit Masuk")}
              className={`flex-1 py-4 text-sm font-semibold transition-colors cursor-pointer ${
                activeTab === "Visit Masuk"
                  ? "bg-[#050B20] text-white"
                  : "bg-white text-gray-600 hover:bg-gray-100"
              }`}
            >
              Visit Masuk
            </button>
            <button
              onClick={() => setActiveTab("Visit Keluar")}
              className={`flex-1 py-4 text-sm font-semibold transition-colors cursor-pointer ${
                activeTab === "Visit Keluar"
                  ? "bg-[#050B20] text-white"
                  : "bg-white text-gray-600 hover:bg-gray-100"
              }`}
            >
              Visit Keluar
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
                    <th className="p-4 font-semibold text-sm text-gray-700">Cabang / Outlet</th>
                    <th className="p-4 font-semibold text-sm text-gray-700">Lokasi GPS</th>
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
                          <td className="p-4 text-sm text-gray-800 font-semibold">
                            {log.cabang || "-"}
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
                      <td colSpan={5} className="p-8 text-center text-gray-500">
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
