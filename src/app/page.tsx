"use client";

import { useState, useEffect, Suspense, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  checkNikStatus,
  activateUserWithPassword,
  loginWithNikAndPassword,
  getStoredSession,
} from "@/services/authService";
import { UserProfile } from "@/types";

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "register" ? "register" : "login";

  // Tab: "login" atau "register"
  const [authTab, setAuthTab] = useState<"login" | "register">(initialTab);

  // Form State: LOGIN
  const [loginIdentifier, setLoginIdentifier] = useState<string>("");
  const [loginPassword, setLoginPassword] = useState<string>("");
  const [showLoginPassword, setShowLoginPassword] = useState<boolean>(false);

  // Form State: REGISTER (Aktivasi Karyawan Baru)
  const [regNik, setRegNik] = useState<string>("");
  const [isCheckingNik, setIsCheckingNik] = useState<boolean>(false);
  const [registeredUser, setRegisteredUser] = useState<UserProfile | null>(null);
  const [regPassword, setRegPassword] = useState<string>("");
  const [regConfirmPassword, setRegConfirmPassword] = useState<string>("");
  const [showRegPassword, setShowRegPassword] = useState<boolean>(false);

  // Status & Feedback
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");

  // Auto-redirect jika user/admin sudah login sebelumnya
  useEffect(() => {
    const stored = getStoredSession();
    if (stored) {
      const role = (stored.role || "").toLowerCase().trim();
      if (role === "admin" || role === "super admin") {
        router.replace("/admin");
      } else {
        router.replace("/dashboard");
      }
    }
  }, [router]);

  // Sync tab jika param berubah
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "register") setAuthTab("register");
    else if (tabParam === "login") setAuthTab("login");
  }, [searchParams]);

  // Reset Register NIK selection
  const handleResetRegNik = () => {
    setRegisteredUser(null);
    setRegPassword("");
    setRegConfirmPassword("");
    setErrorMessage("");
    setSuccessMessage("");
  };

  // Switch Tab Handler
  const handleSwitchTab = (tab: "login" | "register") => {
    setAuthTab(tab);
    setErrorMessage("");
    setSuccessMessage("");
  };

  // ==========================================
  // HANDLER 1: SUBMIT LOGIN (NIK ATAU EMAIL)
  // ==========================================
  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    const identifier = loginIdentifier.trim();
    if (!identifier || !loginPassword) {
      setErrorMessage("Silakan isi NIK/Email dan Password Anda.");
      setIsLoading(false);
      return;
    }

    try {
      // loginWithNikAndPassword mendukung NIK maupun Email via Firestore
      const { profile: loggedInProfile } = await loginWithNikAndPassword(
        identifier,
        loginPassword
      );
      const role = (loggedInProfile.role || "").toLowerCase().trim();

      // Pengalihan hak akses
      if (role === "admin" || role === "super admin") {
        router.replace("/admin");
      } else {
        router.replace("/dashboard");
      }
    } catch (error: any) {
      console.error("Login error:", error);
      setErrorMessage(error.message || "Login gagal. Periksa koneksi internet Anda.");
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // HANDLER 2: CEK NIK DI TAB REGISTER
  // ==========================================
  const handleCheckRegNik = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    const cleanNik = regNik.trim();
    if (!cleanNik) {
      setErrorMessage("Silakan masukkan NIK Anda.");
      return;
    }

    setIsCheckingNik(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const { exists, profile } = await checkNikStatus(cleanNik);
      if (!exists || !profile) {
        setErrorMessage(
          "NIK tidak terdaftar dalam sistem. Pastikan NIK Anda sudah didaftarkan terlebih dahulu oleh Super Admin."
        );
        setRegisteredUser(null);
      } else {
        setRegisteredUser(profile);
        if (profile.passwordSet) {
          setErrorMessage(
            "Akun dengan NIK ini sudah pernah diaktivasi dan memiliki password. Silakan langsung masuk pada tab Login."
          );
        } else {
          setSuccessMessage(
            `Data NIK ditemukan! Halo, ${profile.displayName} (${profile.jabatan || "Karyawan"}). Silakan buat password baru Anda di bawah ini.`
          );
        }
      }
    } catch (err: any) {
      console.error("Error cek NIK:", err);
      setErrorMessage("Gagal menghubungkan ke database server. Coba lagi.");
    } finally {
      setIsCheckingNik(false);
    }
  };

  // ==========================================
  // HANDLER 3: SUBMIT AKTIVASI / REGISTER
  // ==========================================
  const handleRegisterSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!registeredUser) return;

    if (registeredUser.passwordSet) {
      setErrorMessage("Akun dengan NIK ini sudah aktif. Silakan masuk pada tab Login.");
      return;
    }

    if (regPassword.length < 6) {
      setErrorMessage("Password minimal 6 karakter.");
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setErrorMessage("Konfirmasi password tidak cocok!");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const activated = await activateUserWithPassword(
        registeredUser.nik || regNik.trim(),
        regPassword
      );
      const role = (activated.role || registeredUser.role || "").toLowerCase().trim();
      if (role === "admin" || role === "super admin") {
        router.replace("/admin");
      } else {
        router.replace("/dashboard");
      }
    } catch (error: any) {
      console.error("Aktivasi error:", error);
      setErrorMessage(error.message || "Gagal mengaktifkan akun. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050B20] text-white flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md my-8">
        <h1 className="text-2xl font-bold text-center mb-1">
          Sistem Absensi Pegadaian
        </h1>
        <p className="text-center text-slate-400 text-xs mb-6">
          Portal Presensi Mandiri Pegadaian
        </p>

        {/* ILUSTRASI */}
        <div className="bg-[#0B1536] h-36 w-full rounded-2xl mb-6 flex items-center justify-center border border-blue-900/60 overflow-hidden relative shadow-xl">
          <Image
            src="/ilustrasi.png"
            alt="Ilustrasi Absensi"
            width={400}
            height={150}
            className="w-full h-full object-cover"
            priority
          />
        </div>

        {/* TABS: LOGIN & REGISTER */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900 border border-slate-800 rounded-2xl mb-6">
          <button
            type="button"
            onClick={() => handleSwitchTab("login")}
            className={`py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${authTab === "login"
              ? "bg-linear-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/30"
              : "text-slate-400 hover:text-white"
              }`}
          >
            <span>🔑</span>
            <span>Login</span>
          </button>

          <button
            type="button"
            onClick={() => handleSwitchTab("register")}
            className={`py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${authTab === "register"
              ? "bg-linear-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/30"
              : "text-slate-400 hover:text-white"
              }`}
          >
            <span>📝</span>
            <span>Register</span>
          </button>
        </div>

        {/* ERROR / SUCCESS NOTIFICATIONS */}
        {errorMessage && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/50 text-rose-200 text-xs flex items-start gap-2 shadow-lg animate-fadeIn">
            <span className="text-base leading-none">⚠️</span>
            <div className="leading-relaxed">{errorMessage}</div>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-200 text-xs flex items-start gap-2 shadow-lg animate-fadeIn">
            <span className="text-base leading-none">💡</span>
            <div className="leading-relaxed">{successMessage}</div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 1: FORM LOGIN (USER AKTIF / SUPER ADMIN)              */}
        {/* ========================================================= */}
        {authTab === "login" && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                NIK atau Email*
              </label>
              <input
                type="text"
                value={loginIdentifier}
                onChange={(e) => setLoginIdentifier(e.target.value)}
                placeholder="Contoh: 12345678 atau nama@pegadaian.co.id"
                className="w-full px-4 py-3 rounded-xl text-white bg-slate-900 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm placeholder-slate-500"
                required
                autoFocus
              />
              <p className="text-[11px] text-slate-400 mt-1.5">
                Masukkan NIK untuk Karyawan atau Email untuk Admin.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Password*
              </label>
              <input
                type={showLoginPassword ? "text" : "password"}
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Masukkan password Anda"
                className="w-full px-4 py-3 rounded-xl text-white bg-slate-900 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm placeholder-slate-500"
                required
              />
            </div>

            {/* SHOW PASSWORD & LUPA PASSWORD */}
            <div className="flex justify-between items-center text-xs pt-0.5">
              <button
                type="button"
                className="text-slate-400 hover:text-slate-200 cursor-pointer select-none flex items-center gap-1.5"
                onClick={() => setShowLoginPassword(!showLoginPassword)}
              >
                <span>{showLoginPassword ? "👁️ Sembunyikan" : "👁️ Tampilkan password"}</span>
              </button>

              <Link
                href="/forgot-password"
                className="text-blue-400 hover:text-blue-300 underline cursor-pointer text-xs"
              >
                Lupa password?
              </Link>
            </div>

            {/* BUTTON LOGIN */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3.5 rounded-xl transition cursor-pointer shadow-lg shadow-blue-500/25 active:scale-98 disabled:opacity-50 text-sm mt-3"
            >
              {isLoading ? "Memproses..." : "Masuk ke Akun 🚀"}
            </button>

            {/* SWITCH TO REGISTER HELPER */}
            <div className="pt-3 text-center">
              <p className="text-xs text-slate-400">
                Karyawan baru dan belum punya password?{" "}
                <button
                  type="button"
                  onClick={() => handleSwitchTab("register")}
                  className="text-blue-400 hover:text-blue-300 font-bold underline cursor-pointer"
                >
                  Aktivasi di Register →
                </button>
              </p>
            </div>
          </form>
        )}

        {/* ========================================================= */}
        {/* TAB 2: FORM REGISTER (AKTIVASI USER DENGAN NIK DARI ADMIN) */}
        {/* ========================================================= */}
        {authTab === "register" && (
          <div className="space-y-4">
            <div className="bg-blue-950/40 border border-blue-500/30 rounded-2xl p-3.5 text-xs text-blue-200 flex items-start gap-2.5">
              <span className="text-base leading-none">🛡️</span>
              <p className="leading-relaxed">
                <strong>Khusus Karyawan Baru:</strong> Masukkan NIK Anda yang telah didaftarkan oleh Super Admin untuk membuat password baru pertama kali.
              </p>
            </div>

            {!registeredUser ? (
              /* LANGKAH 1 REGISTER: INPUT NIK */
              <form onSubmit={handleCheckRegNik} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Nomor Induk Karyawan (NIK)*
                  </label>
                  <input
                    type="text"
                    value={regNik}
                    onChange={(e) => setRegNik(e.target.value)}
                    placeholder="Contoh: 12345678"
                    className="w-full px-4 py-3 rounded-xl text-white bg-slate-900 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm placeholder-slate-500"
                    required
                    autoFocus
                  />
                  <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                    Pastikan NIK sudah didaftarkan oleh Super Admin sebelumnya.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isCheckingNik}
                  className="w-full bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3.5 rounded-xl transition cursor-pointer shadow-lg shadow-blue-500/20 active:scale-98 disabled:opacity-50 text-sm flex items-center justify-center gap-2"
                >
                  {isCheckingNik ? (
                    <>
                      <span className="animate-spin">🔄</span>
                      <span>Memeriksa NIK...</span>
                    </>
                  ) : (
                    <>
                      <span>Verifikasi NIK Karyawan</span>
                      <span>→</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* LANGKAH 2 REGISTER: TAMPILKAN PROFIL & BUAT PASSWORD BARU */
              <div className="space-y-4">
                {/* IDENTITAS KARYAWAN DARI DATABASE */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-base">
                      👤
                    </div>
                    <div>
                      <div className="text-white font-bold text-sm">
                        {registeredUser.displayName}
                      </div>
                      <div className="text-xs text-slate-400">
                        NIK: <strong className="text-slate-200">{registeredUser.nik}</strong>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        {registeredUser.jabatan && (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                            {registeredUser.jabatan}
                          </span>
                        )}
                        <span className="text-[11px] text-blue-400">
                          {registeredUser.kanwil}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleResetRegNik}
                    className="text-xs text-slate-400 hover:text-rose-400 underline cursor-pointer px-2 py-1"
                    title="Ganti NIK lain"
                  >
                    Ganti NIK
                  </button>
                </div>

                {registeredUser.passwordSet ? (
                  /* KASUS NIK SUDAH AKTIF: ARAHKAN KE LOGIN */
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 space-y-3">
                    <div className="text-xs text-amber-200 leading-relaxed">
                      🔒 <strong>Akun Sudah Aktif!</strong> NIK ini sudah pernah membuat password resmi dan tidak dapat didaftarkan ulang.
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSwitchTab("login")}
                      className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2.5 rounded-xl text-xs transition cursor-pointer shadow-md"
                    >
                      Beralih ke Tab Login 🔑
                    </button>
                  </div>
                ) : (
                  /* KASUS BELUM AKTIF: FORM BUAT PASSWORD */
                  <form onSubmit={handleRegisterSubmit} className="space-y-4">
                    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-xs text-emerald-200">
                      ✨ <strong>Aktivasi Pertama Kali:</strong> Buat password baru Anda. Password ini akan digunakan untuk login seterusnya.
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Email Resmi Terdaftar
                      </label>
                      <input
                        type="text"
                        value={registeredUser.email}
                        readOnly
                        className="w-full px-4 py-2.5 rounded-xl text-slate-400 bg-slate-950 border border-slate-800 text-xs font-mono select-none cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Buat Password Baru* (Min. 6 karakter)
                      </label>
                      <input
                        type={showRegPassword ? "text" : "password"}
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Masukkan password baru Anda"
                        className="w-full px-4 py-3 rounded-xl text-white bg-slate-900 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        required
                        autoFocus
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Konfirmasi Password Baru*
                      </label>
                      <input
                        type={showRegPassword ? "text" : "password"}
                        value={regConfirmPassword}
                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                        placeholder="Ketik ulang password baru Anda"
                        className="w-full px-4 py-3 rounded-xl text-white bg-slate-900 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        required
                      />
                    </div>

                    <div className="flex justify-start items-center text-xs">
                      <button
                        type="button"
                        className="text-slate-400 hover:text-slate-200 cursor-pointer select-none flex items-center gap-1.5"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                      >
                        <span>{showRegPassword ? "👁️ Sembunyikan" : "👁️ Tampilkan password"}</span>
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3.5 rounded-xl transition cursor-pointer shadow-lg shadow-blue-500/25 active:scale-98 disabled:opacity-50 text-sm mt-3"
                    >
                      {isLoading ? "Mengaktifkan..." : "Daftarkan & Selesaikan Aktivasi 🚀"}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* SWITCH TO LOGIN HELPER */}
            <div className="pt-3 text-center">
              <p className="text-xs text-slate-400">
                Sudah memiliki password?{" "}
                <button
                  type="button"
                  onClick={() => handleSwitchTab("login")}
                  className="text-blue-400 hover:text-blue-300 font-bold underline cursor-pointer"
                >
                  Masuk di Tab Login →
                </button>
              </p>
            </div>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-slate-800/80 text-center text-xs text-slate-500">
          PT Pegadaian © {new Date().getFullYear()} • Sistem Presensi Internal
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#050B20] text-white flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-blue-400/30 border-t-blue-500 rounded-full animate-spin" />
        </div>
      }
    >
      <AuthContent />
    </Suspense>
  );
}
