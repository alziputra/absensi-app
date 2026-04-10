"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Image from "next/image";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/dashboard");
    } catch (error) {
      alert("Login gagal: Periksa email dan password Anda.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050B20] text-white flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-8">
          Selamat datang di Aplikasi
          <br />
          Absensi kami!
        </h1>

        <div className="bg-[#0B1536] h-40 w-full rounded-xl mb-8 flex items-center justify-center border border-blue-900 overflow-hidden relative">
          <Image
            src="/ilustrasi.png" /* Memanggil gambar dari folder public */
            alt="Ilustrasi Absensi"
            width={400}
            height={160}
            className="w-full h-full object-cover" /* <--- Perubahan: hapus p-4, ubah object-contain ke object-cover */
            priority /* priority memberi tahu Next.js untuk memuat gambar ini duluan karena ada di halaman depan */
          />
        </div>

        <p className="text-center text-gray-300 mb-8 text-sm">
          Silahkan Login menggunakan Akun
          <br />
          yang sudah dibuat coyy!
        </p>

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
              // 👇 Tambahkan bg-white di baris bawah ini
              className="w-full px-4 py-3 rounded-lg text-black bg-white focus:outline-none"
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
              // 👇 Tambahkan bg-white di baris bawah ini
              className="w-full px-4 py-3 rounded-lg text-black bg-white focus:outline-none"
              required
            />
          </div>
          <div
            className="flex items-center text-sm mt-2 cursor-pointer"
            onClick={() => setShowPassword(!showPassword)}
          >
            <span>Show password {showPassword ? "👁️‍🗨️" : "👁️"}</span>
          </div>

          <div className="text-blue-400 text-sm mb-6 underline cursor-pointer hover:text-blue-300">
            Lupa password?
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full bg-white text-[#0aa5ff] font-bold py-3 rounded-lg border-2 border-[#0aa5ff] transition ${isLoading ? "opacity-50" : "hover:bg-gray-100"}`}
          >
            {isLoading ? "Memproses..." : "Masuk"}
          </button>
        </form>
      </div>
    </div>
  );
}
