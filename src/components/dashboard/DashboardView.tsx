"use client";

import { useState, useRef, FormEvent, ChangeEvent } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { checkHasAbsenToday, recordAbsensi } from "@/services/absensiService";
import { compressAndUploadPhoto } from "@/services/storageService";
import { getCurrentCoordinates } from "@/utils/location";
import { calculateLateStatus } from "@/utils/formatters";
import { WORK_HOURS } from "@/config/constants";
import { TipeAbsen } from "@/types";
import HeaderClock from "./HeaderClock";
import ActionButtons from "./ActionButtons";
import VisitModal from "./VisitModal";
import StatusModal from "@/components/layout/StatusModal";
import BottomNav from "@/components/layout/BottomNav";
import AlertModal, { AlertType } from "@/components/ui/AlertModal";

export default function DashboardView() {
  const { user, profile, isAdmin, isLoading: authLoading, userName } = useAuth();

  const [absenType, setAbsenType] = useState<TipeAbsen | "">("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMsg, setLoadingMsg] = useState<string>("");

  const [showVisitModal, setShowVisitModal] = useState<boolean>(false);
  const [visitType, setVisitType] = useState<TipeAbsen | "">("");
  const [namaCabang, setNamaCabang] = useState<string>("");

  // State untuk AlertModal (menggantikan native browser alert)
  const [alertConfig, setAlertConfig] = useState<{
    isOpen: boolean;
    type: AlertType;
    title: string;
    message: string;
    confirmText?: string;
  }>({
    isOpen: false,
    type: "info",
    title: "",
    message: "",
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showAlert = (
    type: AlertType,
    title: string,
    message: string,
    confirmText: string = "Mengerti"
  ) => {
    setAlertConfig({
      isOpen: true,
      type,
      title,
      message,
      confirmText,
    });
  };

  const closeAlert = () => {
    setAlertConfig((prev) => ({ ...prev, isOpen: false }));
  };

  // --- PROSES ABSENSI LANGSUNG (TANPA FOTO) ---
  const processAbsensiDirect = async (type: "Absen Masuk" | "Absen Pulang") => {
    if (!user) return;

    setIsLoading(true);
    setLoadingMsg(`Mencatat ${type}...`);

    try {
      const lokasiAbsen = await getCurrentCoordinates();

      if (!lokasiAbsen || lokasiAbsen.includes("Tanpa") || lokasiAbsen.includes("Gagal")) {
        setIsLoading(false);
        setLoadingMsg("");
        showAlert(
          "error",
          "GPS Wajib Aktif",
          `Gagal mencatat ${type}. Akses lokasi (GPS) tidak ditemukan atau tidak diizinkan. Mohon aktifkan lokasi (GPS) pada perangkat Anda dan beri izin lokasi pada browser.`
        );
        return;
      }

      let statusTelat: "Tepat Waktu" | "Terlambat" | "-" = "-";
      let detailTelat = "-";

      if (type === "Absen Masuk") {
        const lateInfo = calculateLateStatus(
          new Date(),
          WORK_HOURS.MAX_CHECKIN_HOUR,
          WORK_HOURS.MAX_CHECKIN_MINUTE
        );
        statusTelat = lateInfo.status;
        detailTelat = lateInfo.detail;
      }

      await recordAbsensi(
        user.uid,
        {
          tipe_absen: type,
          foto_url: "-", // Absensi tanpa foto
          lokasi: lokasiAbsen,
          cabang: "-",
          status_kehadiran: statusTelat,
          detail_keterlambatan: detailTelat,
        },
        profile
      );

      setLoadingMsg(`Sukses! ${type} berhasil dicatat.`);
      setTimeout(() => {
        setLoadingMsg("");
        setIsLoading(false);
      }, 2500);
    } catch (error: any) {
      console.error("Gagal mencatat absensi:", error);
      setIsLoading(false);
      setLoadingMsg("");
      showAlert(
        "error",
        "Gagal Absen",
        error.message || `Terjadi kendala saat memproses ${type}. Pastikan koneksi internet dan GPS aktif.`
      );
    }
  };

  const handleAbsenClick = async (type: TipeAbsen) => {
    if (!user) {
      showAlert(
        "error",
        "Sesi Tidak Valid",
        "Sesi login Anda telah berakhir. Silakan login kembali."
      );
      return;
    }

    setIsLoading(true);
    setLoadingMsg(`Mengecek status ${type}...`);

    try {
      // 1. Cek Anti-dobel Absen Masuk
      if (type === "Absen Masuk") {
        const sudahMasuk = await checkHasAbsenToday(user.uid, "Absen Masuk");
        if (sudahMasuk) {
          setIsLoading(false);
          setLoadingMsg("");
          showAlert(
            "warning",
            "Sudah Absen Masuk",
            "Anda sudah melakukan Absen Masuk hari ini! Tidak perlu absen ganda."
          );
          return;
        }

        // Langsung proses Absen Masuk tanpa foto
        await processAbsensiDirect("Absen Masuk");
        return;
      }

      // 2. Cek Anti-dobel Absen Pulang
      if (type === "Absen Pulang") {
        const sudahMasuk = await checkHasAbsenToday(user.uid, "Absen Masuk");
        if (!sudahMasuk) {
          setIsLoading(false);
          setLoadingMsg("");
          showAlert(
            "warning",
            "Belum Absen Masuk",
            "Peringatan: Anda belum melakukan Absen Masuk hari ini!"
          );
          return;
        }

        const sudahPulang = await checkHasAbsenToday(user.uid, "Absen Pulang");
        if (sudahPulang) {
          setIsLoading(false);
          setLoadingMsg("");
          showAlert(
            "info",
            "Sudah Absen Pulang",
            "Anda sudah melakukan Absen Pulang hari ini! Silakan istirahat."
          );
          return;
        }

        // Langsung proses Absen Pulang tanpa foto
        await processAbsensiDirect("Absen Pulang");
        return;
      }

      // 3. Logika Visit (Masuk / Keluar)
      if (type.includes("Visit")) {
        setIsLoading(false);
        setLoadingMsg("");
        setVisitType(type);
        setNamaCabang("");
        setShowVisitModal(true);
        return;
      }
    } catch (error) {
      console.error("Gagal verifikasi status:", error);
      setIsLoading(false);
      setLoadingMsg("");
      showAlert(
        "error",
        "Terjadi Kesalahan",
        "Gagal memeriksa status absensi. Silakan coba beberapa saat lagi."
      );
    }
  };

  const handleVisitSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!namaCabang.trim()) {
      showAlert(
        "warning",
        "Form Belum Lengkap",
        "Nama Cabang / Outlet wajib diisi sebelum melanjutkan!"
      );
      return;
    }

    setShowVisitModal(false);
    setAbsenType(visitType);

    if (visitType === "Visit Masuk") {
      fileInputRef.current?.click();
    } else if (visitType === "Visit Keluar") {
      processVisitKeluarTanpaFoto();
    }
  };

  const processVisitKeluarTanpaFoto = async () => {
    if (!user) return;
    setIsLoading(true);
    setLoadingMsg(`Memproses Keluar ${namaCabang}...`);

    try {
      const lokasiAbsen = await getCurrentCoordinates();

      if (!lokasiAbsen || lokasiAbsen.includes("Tanpa") || lokasiAbsen.includes("Gagal")) {
        setIsLoading(false);
        setLoadingMsg("");
        showAlert(
          "error",
          "GPS Wajib Aktif",
          "Gagal mencatat Visit Keluar. Akses lokasi (GPS) tidak ditemukan atau tidak diizinkan. Mohon aktifkan lokasi (GPS) pada perangkat Anda dan beri izin lokasi pada browser."
        );
        return;
      }

      await recordAbsensi(
        user.uid,
        {
          tipe_absen: "Visit Keluar",
          foto_url: "-",
          lokasi: lokasiAbsen,
          cabang: namaCabang,
          status_kehadiran: "-",
          detail_keterlambatan: "-",
        },
        profile
      );

      setLoadingMsg(`Sukses! Visit Keluar ${namaCabang} dicatat.`);
      setTimeout(() => {
        setLoadingMsg("");
        setIsLoading(false);
      }, 2500);
    } catch (error: any) {
      console.error(error);
      setIsLoading(false);
      setLoadingMsg("");
      showAlert(
        "error",
        "Gagal Visit Keluar",
        error.message || "Terjadi kendala saat mencatat visit keluar. Silakan coba kembali."
      );
    }
  };

  // Upload foto untuk Visit Masuk (tersimpan ke absensi/{userId}/)
  const handlePhotoCapture = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !absenType) return;

    setIsLoading(true);
    setLoadingMsg(`Mendeteksi lokasi GPS...`);

    try {
      const lokasiAbsen = await getCurrentCoordinates();

      if (!lokasiAbsen || lokasiAbsen.includes("Tanpa") || lokasiAbsen.includes("Gagal")) {
        setIsLoading(false);
        setLoadingMsg("");
        showAlert(
          "error",
          "GPS Wajib Aktif",
          `Gagal memproses ${absenType}. Akses lokasi (GPS) tidak ditemukan atau tidak diizinkan. Mohon aktifkan lokasi (GPS) pada perangkat Anda dan beri izin lokasi pada browser.`
        );
        return;
      }

      setLoadingMsg("Mengunggah foto bukti...");
      const photoURL = await compressAndUploadPhoto(file, user.uid, "absensi");

      await recordAbsensi(
        user.uid,
        {
          tipe_absen: absenType as TipeAbsen,
          foto_url: photoURL,
          lokasi: lokasiAbsen,
          cabang: namaCabang || "-",
          status_kehadiran: "-",
          detail_keterlambatan: "-",
        },
        profile
      );

      setLoadingMsg(`Sukses! ${absenType} dicatat.`);
      setTimeout(() => {
        setLoadingMsg("");
        setIsLoading(false);
      }, 2500);
    } catch (error: any) {
      console.error(error);
      setIsLoading(false);
      setLoadingMsg("");
      showAlert(
        "error",
        "Gagal Unggah",
        error.message || "Gagal memproses visit. Pastikan koneksi internet dan izin kamera aktif."
      );
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white relative overflow-x-hidden flex flex-col items-center pt-10 pb-28 font-sans">
      {/* BEAUTIFUL ALERT MODAL (NO MORE BROWSER ALERTS!) */}
      <AlertModal
        isOpen={alertConfig.isOpen}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        confirmText={alertConfig.confirmText}
        onClose={closeAlert}
      />

      {/* STATUS MODAL FEEDBACK */}
      <StatusModal message={loadingMsg} />

      {/* VISIT INPUT MODAL */}
      <VisitModal
        isOpen={showVisitModal}
        visitType={visitType}
        namaCabang={namaCabang}
        onChangeCabang={setNamaCabang}
        onClose={() => setShowVisitModal(false)}
        onSubmit={handleVisitSubmit}
      />

      {/* BACKGROUND DECORATIONS */}
      <div className="absolute top-0 left-0 w-24 h-64 bg-[#0aa5ff] rounded-br-full -z-10" />
      <div className="absolute top-40 right-10 w-6 h-6 bg-[#0aa5ff] rounded-full -z-10" />
      <div className="absolute top-[28rem] right-[-2rem] w-32 h-32 bg-[#0aa5ff] rounded-full -z-10" />

      {/* CLOCK & GREETINGS */}
      <HeaderClock userName={userName} />

      {/* HIDDEN CAMERA INPUT (KHUSUS VISIT MASUK) */}
      <input
        type="file"
        accept="image/jpeg, image/png, image/jpg"
        capture="environment"
        ref={fileInputRef}
        onChange={handlePhotoCapture}
        className="hidden"
      />

      {/* CIRCULAR ACTION BUTTONS */}
      <ActionButtons
        onActionClick={handleAbsenClick}
        isLoading={isLoading}
      />

      {/* QUICK LINK KLAIM LUPA ABSEN */}
      <div className="mt-4 px-6 w-full max-w-sm">
        <Link
          href="/klaim-absensi"
          className="flex items-center justify-between p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl text-blue-900 shadow-sm hover:shadow-md hover:border-blue-300 transition group cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center text-sm shadow-sm group-hover:scale-105 transition">
              📝
            </div>
            <div>
              <div className="font-bold text-xs">Lupa Absensi Hari Ini?</div>
              <div className="text-[10px] text-blue-600">Ajukan klaim kehadiran manual</div>
            </div>
          </div>
          <span className="text-xs text-blue-600 font-semibold group-hover:translate-x-0.5 transition">
            Klaim →
          </span>
        </Link>
      </div>

      {/* BOTTOM NAVIGATION */}
      <BottomNav isAdmin={isAdmin} />
    </div>
  );
}
