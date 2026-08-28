"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { registerNewUser } from "@/services/authService";
import { KANWIL_OPTIONS } from "@/config/constants";
import AlertModal, { AlertType } from "@/components/ui/AlertModal";

export default function RegisterPage() {
  const [displayName, setDisplayName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [kanwil, setKanwil] = useState<string>(KANWIL_OPTIONS[0]);
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const router = useRouter();

  const [alertConfig, setAlertConfig] = useState<{
    isOpen: boolean;
    type: AlertType;
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({
    isOpen: false,
    type: "info",
    title: "",
    message: "",
  });

  const showAlert = (
    type: AlertType,
    title: string,
    message: string,
    onConfirm?: () => void
  ) => {
    setAlertConfig({ isOpen: true, type, title, message, onConfirm });
  };

  const closeAlert = () => {
    setAlertConfig((prev) => ({ ...prev, isOpen: false }));
    if (alertConfig.onConfirm) {
      alertConfig.onConfirm();
    }
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (password.length < 6) {
      setErrorMessage("Password minimal 6 karakter!");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Konfirmasi password tidak cocok!");
      return;
    }

    setIsLoading(true);
    try {
      await registerNewUser({
        displayName: displayName.trim(),
        email: email.trim(),
        password,
        kanwil,
        role: "user", // Default role untuk karyawan/user biasa
      });

      showAlert(
        "success",
        "Pendaftaran Berhasil!",
        "Akun Anda telah berhasil dibuat. Silakan klik tombol di bawah untuk masuk ke Dashboard.",
        () => router.push("/dashboard")
      );
    } catch (error: any) {
      console.error("Register error:", error);
      if (error.code === "auth/email-already-in-use") {
        setErrorMessage("Email sudah terdaftar. Silakan login atau gunakan email lain.");
      } else if (error.code === "auth/invalid-email") {
        setErrorMessage("Format email tidak valid.");
      } else if (error.code === "auth/weak-password") {
        setErrorMessage("Password terlalu lemah (minimal 6 karakter).");
      } else {
        setErrorMessage("Gagal mendaftar: " + (error.message || "Terjadi kesalahan sistem."));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050B20] text-white flex flex-col items-center justify-center p-6 font-sans">
      {/* Alert Modal */}
      <AlertModal
        isOpen={alertConfig.isOpen}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        confirmText="Masuk ke Dashboard"
        onClose={closeAlert}
      />

      <div className="w-full max-w-md my-8">
        <h1 className="text-2xl font-bold text-center mb-2">
          Daftar Akun Karyawan
        </h1>
        <p className="text-center text-gray-400 mb-6 text-sm">
          Lengkapi data di bawah untuk membuat akun baru
        </p>

        {errorMessage && (
          <div className="mb-6 p-3 rounded-lg bg-red-900/50 border border-red-500 text-red-200 text-sm animate-shake">
            ⚠️ {errorMessage}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          {/* NAMA LENGKAP */}
          <div>
            <label className="block text-sm font-semibold mb-1">
              Nama Lengkap*
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Contoh: Alzi Rahmana Putra"
              className="w-full px-4 py-3 rounded-lg text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* EMAIL */}
          <div>
            <label className="block text-sm font-semibold mb-1">
              Email Perusahaan / Pribadi*
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contoh@gmail.com"
              className="w-full px-4 py-3 rounded-lg text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* KANWIL */}
          <div>
            <label className="block text-sm font-semibold mb-1">
              Kantor Wilayah (Kanwil)*
            </label>
            <select
              value={kanwil}
              onChange={(e) => setKanwil(e.target.value)}
              className="w-full px-4 py-3 rounded-lg text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              required
            >
              {KANWIL_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* PASSWORD */}
          <div>
            <label className="block text-sm font-semibold mb-1">
              Password* (Min. 6 karakter)
            </label>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan password"
              className="w-full px-4 py-3 rounded-lg text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              minLength={6}
            />
          </div>

          {/* KONFIRMASI PASSWORD */}
          <div>
            <label className="block text-sm font-semibold mb-1">
              Konfirmasi Password*
            </label>
            <input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Ulangi password"
              className="w-full px-4 py-3 rounded-lg text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              minLength={6}
            />
          </div>

          <div
            className="flex items-center text-sm mt-1 cursor-pointer select-none"
            onClick={() => setShowPassword(!showPassword)}
          >
            <span>Show password {showPassword ? "👁️‍🗨️" : "👁️"}</span>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full bg-[#0aa5ff] text-white font-bold py-3 rounded-lg mt-6 transition cursor-pointer hover:bg-blue-500 shadow-lg active:scale-95 ${
              isLoading ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {isLoading ? "Mendaftarkan..." : "Daftar Akun"}
          </button>
        </form>

        <div className="text-center mt-6 text-sm text-gray-400">
          Sudah punya akun?{" "}
          <Link
            href="/"
            className="text-blue-400 font-semibold hover:underline hover:text-blue-300"
          >
            Masuk di sini
          </Link>
        </div>
      </div>
    </div>
  );
}
