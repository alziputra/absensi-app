"use client";
import { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebase";
import { collection, query, getDocs } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ADMIN_EMAILS } from "@/constants"; 

export default function AdminPanel() {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showUnauthorized, setShowUnauthorized] = useState(false);
  const router = useRouter();

  // (Baris const ADMIN_EMAILS lokal sudah dihapus dari sini agar murni pakai import dari constants.js)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/");
      } else {
        if (ADMIN_EMAILS.includes(user.email)) {
          fetchAllData();
        } else {
          setShowUnauthorized(true);
        }
      }
    });
    return () => unsubscribe();
  }, [router]);

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, "absensi_logs"));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        waktuObj: doc.data().waktu ? doc.data().waktu.toDate() : new Date(),
      }));

      data.sort((a, b) => b.waktuObj - a.waktuObj);
      setLogs(data);
    } catch (error) {
      console.error("Gagal mengambil data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/");
  };

  const filteredLogs = logs.filter((log) => {
    const searchLower = searchTerm.toLowerCase();
    const nama = (log.nama || "").toLowerCase();
    const email = (log.email || "").toLowerCase();
    const tipe = (log.tipe_absen || "").toLowerCase();
    return (
      nama.includes(searchLower) ||
      email.includes(searchLower) ||
      tipe.includes(searchLower)
    );
  });

  return (
    <div className="min-h-screen bg-gray-100 font-sans relative">
      {/* Unauthorized Access Modal */}
      {showUnauthorized && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black bg-opacity-70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center max-w-sm animate-bounce">
            <div className="text-6xl mb-4">👮‍♂️</div>
            <h3 className="text-2xl font-bold text-red-600 mb-2">Akses Ditolak!</h3>
            <p className="text-gray-700 font-medium text-lg mb-6">
              Nakal yeee!! Lapor Alzi dulu kalau mau jadi admin!!
            </p>
            <button 
              onClick={() => router.push('/dashboard')}
              className="w-full bg-red-600 text-white py-3 rounded-lg font-bold hover:bg-red-700 transition"
            >
              Kembali ke Jalan yang Benar
            </button>
          </div>
        </div>
      )}

      {/* Navbar Khusus Admin */}
      <header className="bg-red-800 text-white p-4 flex justify-between items-center shadow-md sticky top-0 z-50">
        <div className="font-bold text-xl flex items-center gap-2">
          <span>🛡️</span> Admin Panel
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="text-sm hover:text-red-200 transition"
          >
            Ke Dashboard Biasa
          </Link>
          <button
            onClick={handleLogout}
            className="bg-white text-red-800 px-4 py-1.5 rounded font-bold text-sm hover:bg-gray-200 transition"
          >
            Keluar
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        {/* Header Content */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center my-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              Rekap Seluruh Karyawan
            </h1>
            <p className="text-gray-500 mt-1">
              Pantau absensi dan visit dari satu layar.
            </p>
          </div>

          {/* Kolom Pencarian */}
          <div className="w-full md:w-72">
            <input
              type="text"
              placeholder="Cari nama, email, atau tipe..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Tabel Data Super Admin */}
        <div className="bg-white shadow-lg border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-20 text-center flex flex-col items-center">
                <div className="w-12 h-12 border-4 border-red-200 border-t-red-800 rounded-full animate-spin mb-4"></div>
                <p className="text-gray-500 font-medium">
                  Memuat data server...
                </p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead className="bg-gray-800 text-white">
                  <tr>
                    <th className="p-4 font-semibold text-sm">Waktu ↓</th>
                    <th className="p-4 font-semibold text-sm">
                      Identitas Karyawan
                    </th>
                    <th className="p-4 font-semibold text-sm">Tipe & Status</th>
                    <th className="p-4 font-semibold text-sm">
                      Cabang / Lokasi
                    </th>
                    <th className="p-4 font-semibold text-sm text-center">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.length > 0 ? (
                    filteredLogs.map((log) => {
                      const tgl = log.waktuObj.toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      });
                      const jam = log.waktuObj.toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      });

                      return (
                        <tr
                          key={log.id}
                          className="border-b border-gray-100 hover:bg-red-50 transition-colors"
                        >
                          {/* Waktu */}
                          <td className="p-4">
                            <div className="font-bold text-gray-800">{jam}</div>
                            <div className="text-xs text-gray-500">{tgl}</div>
                          </td>

                          {/* Identitas */}
                          <td className="p-4">
                            <div className="font-semibold text-gray-800">
                              {log.nama || "User Lama"}
                            </div>
                            <div className="text-xs text-gray-500">
                              {log.email || log.userId}
                            </div>
                          </td>

                          {/* Tipe Absen */}
                          <td className="p-4">
                            <div className="font-semibold text-blue-700">
                              {log.tipe_absen}
                            </div>
                            {log.status_kehadiran &&
                              log.status_kehadiran !== "-" && (
                                <span
                                  className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${log.status_kehadiran === "Terlambat" ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"}`}
                                >
                                  {log.status_kehadiran}
                                </span>
                              )}
                          </td>

                          {/* Cabang & Lokasi */}
                          <td className="p-4">
                            {log.cabang && log.cabang !== "-" && (
                              <div className="font-semibold text-gray-800 mb-1">
                                📍 {log.cabang}
                              </div>
                            )}
                            {log.lokasi && !log.lokasi.includes("Tanpa") ? (
                              <a
                                href={`https://maps.google.com/?q=${log.lokasi}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-500 hover:underline"
                              >
                                Buka Google Maps
                              </a>
                            ) : (
                              <span className="text-xs text-gray-400">
                                Tanpa GPS
                              </span>
                            )}
                          </td>

                          {/* Foto */}
                          <td className="p-4 text-center">
                            {log.foto_url && log.foto_url !== "-" ? (
                              <a
                                href={log.foto_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-block bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-semibold hover:bg-blue-100"
                              >
                                Lihat Foto
                              </a>
                            ) : (
                              <span className="text-xs text-gray-400 italic">
                                Tidak ada foto
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan="5"
                        className="p-10 text-center text-gray-500"
                      >
                        Tidak ada data ditemukan.
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