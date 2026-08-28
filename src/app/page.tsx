"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/config/firebase";
import { syncUserProfile } from "@/services/authService";
import Image from "next/image";

export default function LoginPage() {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const router = useRouter();

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );
      // Sync user profile to absensi-app/{uid} in Firestore
      await syncUserProfile(userCredential.user);
      router.push("/dashboard");
    } catch (error: any) {
      console.error("Login error:", error);
      if (
        error.code === "auth/invalid-credential" ||
        error.code === "auth/wrong-password" ||
        error.code === "auth/user-not-found"
      ) {
        setErrorMessage("Email atau password yang Anda masukkan salah.");
      } else if (error.code === "auth/too-many-requests") {
        setErrorMessage("Terlalu banyak percobaan gagal. Silakan coba lagi nanti.");
      } else {
        setErrorMessage("Login gagal: Periksa koneksi internet dan akun Anda.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050B20] text-white flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md my-8">
        <h1 className="text-2xl font-bold text-center mb-6">
          Selamat datang di Aplikasi
          <br />
          Absensi Pegadaian!
        </h1>

        <div className="bg-[#0B1536] h-40 w-full rounded-xl mb-6 flex items-center justify-center border border-blue-900 overflow-hidden relative">
          <Image
            src="/ilustrasi.png"
            alt="Ilustrasi Absensi"
            width={400}
            height={160}
            className="w-full h-full object-cover"
            priority
          />
        </div>

        <p className="text-center text-gray-300 mb-6 text-sm">
          Silahkan Login menggunakan Akun
          <br />
          yang sudah didaftarkan!
        </p>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-lg bg-red-900/50 border border-red-500 text-red-200 text-sm">
            ⚠️ {errorMessage}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1">
              Email / Username*
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Masukkan email anda"
              className="w-full px-4 py-3 rounded-lg text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Password*
            </label>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan password anda"
              className="w-full px-4 py-3 rounded-lg text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="flex justify-between items-center text-sm pt-1">
            <div
              className="flex items-center cursor-pointer select-none text-gray-300"
              onClick={() => setShowPassword(!showPassword)}
            >
              <span>{showPassword ? "👁️ Sembunyikan" : "👁️ Tampilkan password"}</span>
            </div>

            <Link
              href="/forgot-password"
              className="text-blue-400 hover:text-blue-300 underline cursor-pointer text-sm"
            >
              Lupa password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full bg-white text-[#0aa5ff] font-bold py-3 rounded-lg border-2 border-[#0aa5ff] transition cursor-pointer mt-4 ${
              isLoading ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-100 shadow-lg"
            }`}
          >
            {isLoading ? "Memproses..." : "Masuk"}
          </button>
        </form>

        <div className="text-center mt-6 text-sm text-gray-400">
          Belum punya akun?{" "}
          <Link
            href="/register"
            className="text-blue-400 font-semibold hover:underline hover:text-blue-300"
          >
            Daftar di sini
          </Link>
        </div>
      </div>
    </div>
  );
}
