"use client";

import { useState, FormEvent } from "react";
import { AbsensiLogItem, UserProfile } from "@/types";
import { generateManageServiceExcel } from "@/services/excelService";

interface ExportReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: AbsensiLogItem[];
  userProfile?: UserProfile | null;
  defaultUserName?: string;
}

export default function ExportReportModal({
  isOpen,
  onClose,
  logs,
  userProfile,
  defaultUserName = "",
}: ExportReportModalProps) {
  if (!isOpen) return null;

  // Inisialisasi Tanggal Default (Cut-off standar: 21 Bulan Lalu s/d 20 Bulan Ini)
  const now = new Date();
  const defaultPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 21);
  const defaultCurMonth = new Date(now.getFullYear(), now.getMonth(), 20);

  const formatDateInput = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const [nama, setNama] = useState<string>(
    userProfile?.displayName || defaultUserName || "Karyawan"
  );
  const [jabatan, setJabatan] = useState<string>(
    userProfile
      ? `${userProfile.role || "Manage Service"} ${userProfile.kanwil || ""}`.trim()
      : "Manage Service Kanwil VIII"
  );
  const [namaPerusahaan, setNamaPerusahaan] = useState<string>(
    "PT Global Solusindo Kompudata"
  );
  const [periodeText, setPeriodeText] = useState<string>("XVI(Enam Belas)");
  const [startDateStr, setStartDateStr] = useState<string>(
    formatDateInput(defaultPrevMonth)
  );
  const [endDateStr, setEndDateStr] = useState<string>(
    formatDateInput(defaultCurMonth)
  );

  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Preset Periode Cut-Off (21 Bulan Lalu - 20 Bulan Ini)
  const applyCutoffPreset = () => {
    const n = new Date();
    const prev = new Date(n.getFullYear(), n.getMonth() - 1, 21);
    const cur = new Date(n.getFullYear(), n.getMonth(), 20);
    setStartDateStr(formatDateInput(prev));
    setEndDateStr(formatDateInput(cur));
  };

  // Preset Periode Cut-Off (13 Bulan Lalu - 12 Bulan Ini)
  const applyCutoff13Preset = () => {
    const n = new Date();
    const prev = new Date(n.getFullYear(), n.getMonth() - 1, 13);
    const cur = new Date(n.getFullYear(), n.getMonth(), 12);
    setStartDateStr(formatDateInput(prev));
    setEndDateStr(formatDateInput(cur));
  };

  // Preset Bulan Berjalan (1 s/d Akhir Bulan Ini)
  const applyCurrentMonthPreset = () => {
    const n = new Date();
    const first = new Date(n.getFullYear(), n.getMonth(), 1);
    const last = new Date(n.getFullYear(), n.getMonth() + 1, 0);
    setStartDateStr(formatDateInput(first));
    setEndDateStr(formatDateInput(last));
  };

  const handleExportSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const start = new Date(startDateStr);
    const end = new Date(endDateStr);

    if (start > end) {
      alert("Tanggal Mulai tidak boleh lebih besar dari Tanggal Selesai!");
      return;
    }

    setIsGenerating(true);
    try {
      await generateManageServiceExcel({
        nama: nama.trim(),
        jabatan: jabatan.trim(),
        namaPerusahaan: namaPerusahaan.trim(),
        periodeText: periodeText.trim(),
        startDate: start,
        endDate: end,
        logs: logs,
      });

      onClose();
    } catch (error) {
      console.error("Gagal generate excel:", error);
      alert("Terjadi kesalahan saat membuat file Excel.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm transition-opacity">
      <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto transform animate-fade-in-up border border-gray-100 text-gray-800">
        <div className="flex justify-between items-center mb-5 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg">
              📊
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 leading-tight">
                Export Laporan Absensi (.xlsx)
              </h3>
              <p className="text-xs text-gray-500">
                Format Resmi Template Manage Service Kanwil
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition cursor-pointer text-sm font-semibold"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleExportSubmit} className="space-y-4 text-xs sm:text-sm">
          {/* NAMA KARYAWAN */}
          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              Nama Karyawan*
            </label>
            <input
              type="text"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none text-gray-900 bg-white"
              required
            />
          </div>

          {/* JABATAN */}
          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              Jabatan / Role*
            </label>
            <input
              type="text"
              value={jabatan}
              onChange={(e) => setJabatan(e.target.value)}
              placeholder="Contoh: Manage Service Kanwil VIII"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none text-gray-900 bg-white"
              required
            />
          </div>

          {/* NAMA PERUSAHAAN */}
          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              Nama Perusahaan*
            </label>
            <input
              type="text"
              value={namaPerusahaan}
              onChange={(e) => setNamaPerusahaan(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none text-gray-900 bg-white"
              required
            />
          </div>

          {/* PERIODE TEXT */}
          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              Label Periode (Angka Romawi / Keterangan)*
            </label>
            <input
              type="text"
              value={periodeText}
              onChange={(e) => setPeriodeText(e.target.value)}
              placeholder="Contoh: XVI(Enam Belas)"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none text-gray-900 bg-white"
              required
            />
          </div>

          {/* PRESET PERIODE BUTTONS */}
          <div className="pt-1">
            <label className="block font-semibold text-gray-700 mb-1.5">
              Pilihan Cepat Rentang Tanggal:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={applyCutoffPreset}
                className="py-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-[11px] font-medium transition cursor-pointer text-center"
              >
                21 Lalu - 20 Ini
              </button>
              <button
                type="button"
                onClick={applyCutoff13Preset}
                className="py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-[11px] font-bold transition cursor-pointer text-center shadow-sm"
              >
                13 Lalu - 12 Ini
              </button>
              <button
                type="button"
                onClick={applyCurrentMonthPreset}
                className="py-1.5 px-2 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-xl text-[11px] font-medium transition cursor-pointer text-center"
              >
                1 - Akhir Bln
              </button>
            </div>
          </div>

          {/* TANGGAL MULAI & TANGGAL SELESAI */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Tanggal Mulai*
              </label>
              <input
                type="date"
                value={startDateStr}
                onChange={(e) => setStartDateStr(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none text-gray-900 bg-white"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Tanggal Selesai*
              </label>
              <input
                type="date"
                value={endDateStr}
                onChange={(e) => setEndDateStr(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none text-gray-900 bg-white"
                required
              />
            </div>
          </div>

          {/* BUTTONS */}
          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isGenerating}
              className={`flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition cursor-pointer shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 active:scale-95 ${
                isGenerating ? "opacity-60 cursor-not-allowed" : ""
              }`}
            >
              {isGenerating ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Membuat Excel...</span>
                </>
              ) : (
                <>
                  <span>📥</span>
                  <span>Download Excel (.xlsx)</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

