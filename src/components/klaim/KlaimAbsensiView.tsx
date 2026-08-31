"use client";

import { useState, useEffect, FormEvent, ChangeEvent } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import {
  createKlaimAbsensi,
  getUserKlaimList,
} from "@/services/klaimService";
import { compressAndUploadPhoto } from "@/services/storageService";
import { formatDateID, formatTimeID } from "@/utils/formatters";
import { KlaimAbsenItem, TipeKlaim } from "@/types";
import SidebarMenu from "@/components/layout/SidebarMenu";
import AlertModal, { AlertType } from "@/components/ui/AlertModal";
import StatusModal from "@/components/layout/StatusModal";

export default function KlaimAbsensiView() {
  const { user, profile, isLoading: authLoading } = useAuth();
  const [klaimList, setKlaimList] = useState<KlaimAbsenItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [loadingMsg, setLoadingMsg] = useState<string>("");
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);

  // Form State
  const todayISO = new Date().toISOString().slice(0, 10);
  const [tanggal, setTanggal] = useState<string>(todayISO);
  const [tipeKlaim, setTipeKlaim] = useState<TipeKlaim>("Absen Masuk");
  const [jamMasuk, setJamMasuk] = useState<string>("07:30");
  const [jamPulang, setJamPulang] = useState<string>("17:00");
  const [alasan, setAlasan] = useState<string>("");
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

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
    if (user) {
      loadKlaimData(user.uid);
    }
  }, [user]);

  const loadKlaimData = async (userId: string) => {
    setIsLoading(true);
    try {
      const data = await getUserKlaimList(userId);
      setKlaimList(data);
    } catch (error) {
      console.error("Gagal memuat riwayat klaim:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhotoSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedPhoto(file);
      const url = URL.createObjectURL(file);
      setPhotoPreview(url);
    }
  };

  const handleSubmitKlaim = async (e: FormEvent) => {
    e.preventDefault();

    if (!user) {
      showAlert("error", "Sesi Berakhir", "Silakan login kembali.");
      return;
    }

    if (!tanggal) {
      showAlert("warning", "Data Kurang", "Pilih tanggal kehadiran yang diklaim.");
      return;
    }

    if (!alasan.trim()) {
      showAlert(
        "warning",
        "Alasan Wajib Diisi",
        "Tuliskan alasan lengkap mengapa Anda lupa melakukan absensi."
      );
      return;
    }

    setIsSubmitting(true);
    setLoadingMsg("Mengirim pengajuan klaim...");

    try {
      let photoURL = "-";
      if (selectedPhoto) {
        setLoadingMsg("Mengunggah bukti foto...");
        photoURL = await compressAndUploadPhoto(
          selectedPhoto,
          user.uid,
          "klaim"
        );
      }

      setLoadingMsg("Menyimpan ke sistem...");
      await createKlaimAbsensi(
        user.uid,
        {
          tanggal,
          tipe_klaim: tipeKlaim,
          jam_masuk:
            tipeKlaim === "Absen Masuk" || tipeKlaim === "Absen Masuk & Pulang"
              ? jamMasuk
              : "-",
          jam_pulang:
            tipeKlaim === "Absen Pulang" || tipeKlaim === "Absen Masuk & Pulang"
              ? jamPulang
              : "-",
          alasan,
          foto_url: photoURL,
        },
        profile
      );

      // Reset form
      setAlasan("");
      setSelectedPhoto(null);
      setPhotoPreview(null);

      // Reload data
      await loadKlaimData(user.uid);

      setIsSubmitting(false);
      setLoadingMsg("");
      showAlert(
        "success",
        "Klaim Terkirim!",
        "Pengajuan klaim absensi Anda berhasil dikirim ke Super Admin. Silakan pantau status persetujuan di tabel riwayat di bawah."
      );
    } catch (error: any) {
      console.error("Gagal mengajukan klaim:", error);
      setIsSubmitting(false);
      setLoadingMsg("");
      showAlert(
        "error",
        "Gagal Mengajukan Klaim",
        error.message || "Terjadi kesalahan saat memproses pengajuan klaim."
      );
    }
  };

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

      {/* Loading Modal */}
      <StatusModal message={loadingMsg} />

      {/* Top Header */}
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
        currentPath="/klaim-absensi"
      />

      <main className="max-w-5xl mx-auto p-4 sm:p-6 relative z-10">
        {/* Title */}
        <div className="my-6">
          <div className="flex items-center gap-2 text-xs text-blue-600 font-semibold mb-1">
            <Link href="/dashboard" className="hover:underline">
              Dashboard
            </Link>
            <span>/</span>
            <span>Klaim Kehadiran</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-light text-gray-800 flex items-center gap-2">
            <span>📝</span> Klaim Lupa Absen
          </h1>
          <p className="text-gray-500 text-xs mt-1">
            Formulir pengajuan kehadiran manual kepada Super Admin jika Anda hadir namun lupa melakukan absensi.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* FORM PENGAJUAN (5 Cols on large) */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
              <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2 pb-3 border-b border-gray-100">
                <span>➕</span> Ajukan Klaim Baru
              </h2>

              <form onSubmit={handleSubmitKlaim} className="space-y-4 text-xs">
                {/* Tanggal */}
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">
                    Tanggal Kehadiran <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={tanggal}
                    onChange={(e) => setTanggal(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50/50"
                  />
                </div>

                {/* Tipe Klaim */}
                <div>
                  <label className="block text-gray-700 font-semibold mb-1.5">
                    Jenis Absensi yang Diklaim <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 bg-gray-100 p-1 rounded-xl">
                    {(["Absen Masuk", "Absen Pulang", "Absen Masuk & Pulang"] as TipeKlaim[]).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTipeKlaim(t)}
                        className={`py-2 px-1.5 rounded-lg font-medium text-[11px] transition text-center cursor-pointer ${
                          tipeKlaim === t
                            ? "bg-blue-600 text-white shadow-sm"
                            : "text-gray-600 hover:text-gray-900"
                        }`}
                      >
                        {t === "Absen Masuk & Pulang" ? "Keduanya" : t.replace("Absen ", "")}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Jam Input */}
                {(tipeKlaim === "Absen Masuk" || tipeKlaim === "Absen Masuk & Pulang") && (
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">
                      Jam Kehadiran Masuk
                    </label>
                    <input
                      type="time"
                      value={jamMasuk}
                      onChange={(e) => setJamMasuk(e.target.value)}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50/50"
                    />
                  </div>
                )}

                {(tipeKlaim === "Absen Pulang" || tipeKlaim === "Absen Masuk & Pulang") && (
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">
                      Jam Kepulangan
                    </label>
                    <input
                      type="time"
                      value={jamPulang}
                      onChange={(e) => setJamPulang(e.target.value)}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50/50"
                    />
                  </div>
                )}

                {/* Alasan */}
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">
                    Alasan / Keterangan Lengkap <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Jelaskan alasan mengapa lupa absen (contoh: gangguan koneksi, terburu-buru rapat mendadak, dll)..."
                    value={alasan}
                    onChange={(e) => setAlasan(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50/50"
                  />
                </div>

                {/* Upload Bukti (Opsional) */}
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">
                    Foto Bukti Pendukung (Opsional)
                  </label>
                  <input
                    type="file"
                    accept="image/jpeg, image/png, image/jpg"
                    onChange={handlePhotoSelect}
                    className="w-full text-[11px] text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                  />
                  {photoPreview && (
                    <div className="mt-2 relative w-24 h-24 rounded-xl overflow-hidden border border-gray-200">
                      <img
                        src={photoPreview}
                        alt="Preview Bukti"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold text-sm transition shadow-md shadow-blue-600/20 active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? "Mengirim..." : "Kirim Pengajuan Klaim"}
                </button>
              </form>
            </div>
          </div>

          {/* RIWAYAT PENGAJUAN KLAIM (7 Cols on large) */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100">
                <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
                  <span>📋</span> Riwayat Pengajuan ({klaimList.length})
                </h2>
                <button
                  onClick={() => user && loadKlaimData(user.uid)}
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>🔄</span> Muat Ulang
                </button>
              </div>

              {isLoading || authLoading ? (
                <div className="p-10 text-center text-gray-500 text-xs">
                  <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-2" />
                  Memuat riwayat pengajuan klaim...
                </div>
              ) : klaimList.length === 0 ? (
                <div className="p-12 text-center text-gray-400">
                  <div className="text-4xl mb-2">📭</div>
                  <p className="text-sm font-medium text-gray-600">Belum ada klaim diajukan</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Gunakan formulir di samping untuk mengajukan klaim lupa absen jika diperlukan.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {klaimList.map((item) => {
                    const tglDiajukan = formatDateID(item.createdAtObj);
                    const jamDiajukan = formatTimeID(item.createdAtObj);

                    return (
                      <div
                        key={item.id}
                        className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition space-y-2 text-xs"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-bold text-gray-800 text-sm">
                              {item.tipe_klaim}
                            </span>
                            <div className="text-gray-500 text-[11px] mt-0.5">
                              Tanggal Diklaim:{" "}
                              <span className="font-semibold text-gray-700">
                                {item.tanggal}
                              </span>
                              {item.jam_masuk && item.jam_masuk !== "-" && (
                                <span className="ml-2">
                                  Masuk: <b>{item.jam_masuk}</b>
                                </span>
                              )}
                              {item.jam_pulang && item.jam_pulang !== "-" && (
                                <span className="ml-2">
                                  Pulang: <b>{item.jam_pulang}</b>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Status Badge */}
                          <div>
                            {item.status === "PENDING" && (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                                ⏳ Menunggu Admin
                              </span>
                            )}
                            {item.status === "APPROVED" && (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                                ✓ Disetujui
                              </span>
                            )}
                            {item.status === "REJECTED" && (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                                ✕ Ditolak
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Alasan */}
                        <div className="bg-white p-2.5 rounded-lg border border-gray-100 text-gray-700">
                          <span className="font-semibold text-gray-500 block text-[10px] uppercase">
                            Alasan:
                          </span>
                          <p className="mt-0.5">{item.alasan}</p>
                        </div>

                        {/* Feedback Admin if any */}
                        {item.catatan_admin && item.catatan_admin !== "-" && (
                          <div
                            className={`p-2.5 rounded-lg border text-[11px] ${
                              item.status === "APPROVED"
                                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                                : item.status === "REJECTED"
                                ? "bg-rose-50 border-rose-200 text-rose-800"
                                : "bg-blue-50 border-blue-200 text-blue-800"
                            }`}
                          >
                            <span className="font-bold block text-[10px]">
                              Catatan Super Admin ({item.reviewed_by || "Admin"}):
                            </span>
                            <p className="mt-0.5">{item.catatan_admin}</p>
                          </div>
                        )}

                        <div className="flex justify-between items-center text-[10px] text-gray-400 pt-1">
                          <span>
                            Diajukan: {tglDiajukan} ({jamDiajukan})
                          </span>
                          {item.foto_url && item.foto_url !== "-" && (
                            <a
                              href={item.foto_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 underline font-medium hover:text-blue-800"
                            >
                              Lihat Bukti Foto ↗
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
