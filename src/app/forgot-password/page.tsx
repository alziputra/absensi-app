"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { requestPasswordResetByEmail } from "@/services/authService";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setIsSuccess(false);

    if (!email.trim()) {
      setErrorMessage("Silakan masukkan email Anda!");
      return;
    }

    setIsLoading(true);
    try {
      await requestPasswordResetByEmail(email.trim());
      setIsSuccess(true);
    } catch (error: any) {
      console.error("Forgot password error:", error);
      if (error.message?.includes("tidak terdaftar")) {
        setErrorMessage("Email tidak ditemukan dalam sistem karyawan.");
      } else if (error.code === "auth/invalid-email") {
        setErrorMessage("Format email tidak valid.");
      } else {
        setErrorMessage("Gagal mengajukan reset: " + (error.message || "Terjadi kesalahan."));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050B20] text-white flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-900/50 border border-blue-500 mb-4 text-3xl">
            🔑
          </div>
          <h1 className="text-2xl font-bold">Lupa Password?</h1>
          <p className="text-gray-400 text-sm mt-2">
            Masukkan email terdaftar Anda untuk mengajukan permohonan reset password ke Admin.
          </p>
        </div>

        {isSuccess ? (
          <div className="bg-[#0B1536] border border-green-500/50 rounded-xl p-6 text-center animate-fade-in-up">
            <div className="text-green-400 text-5xl mb-3">✅</div>
            <h3 className="text-lg font-bold text-green-300 mb-2">
              Permintaan Terkirim ke Admin!
            </h3>
            <p className="text-gray-300 text-sm mb-6 leading-relaxed">
              Permintaan reset password untuk akun:
              <br />
              <strong className="text-white">{email}</strong>
              <br />
              telah berhasil diteruskan ke Admin Panel. Admin akan segera mengirimkan tautan reset resmi ke email Anda.
            </p>

            <Link
              href="/"
              className="inline-block w-full bg-white text-[#0aa5ff] font-bold py-3 rounded-lg border-2 border-[#0aa5ff] hover:bg-gray-100 transition"
            >
              Kembali ke Halaman Login
            </Link>
          </div>
        ) : (
          <div className="bg-[#0B1536] border border-blue-900/50 rounded-xl p-6 shadow-xl">
            {errorMessage && (
              <div className="mb-4 p-3 rounded-lg bg-red-900/50 border border-red-500 text-red-200 text-sm">
                ⚠️ {errorMessage}
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">
                  Email Akun Anda*
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contoh@gmail.com"
                  className="w-full px-4 py-3 rounded-lg text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={`w-full bg-[#0aa5ff] text-white font-bold py-3 rounded-lg transition cursor-pointer hover:bg-blue-500 shadow-lg ${
                  isLoading ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {isLoading ? "Mengajukan Permintaan..." : "Ajukan Reset ke Admin"}
              </button>
            </form>

            <div className="text-center mt-6">
              <Link
                href="/"
                className="text-sm text-gray-400 hover:text-white transition flex items-center justify-center gap-1"
              >
                <span>←</span> Kembali ke Login
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
