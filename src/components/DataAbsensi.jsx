'use client'
import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function DataAbsensi() {
  const [logs, setLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('Absen Masuk'); 
  const [isLoading, setIsLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push('/');
      } else {
        fetchData(user.uid);
      }
    });
    return () => unsubscribe();
  }, [router]);

  const fetchData = async (userId) => {
    setIsLoading(true);
    try {
      const q = query(collection(db, "absensi_logs"), where("userId", "==", userId));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        waktuObj: doc.data().waktu ? doc.data().waktu.toDate() : new Date() 
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
    try {
      await signOut(auth);
      router.push('/');
    } catch (error) {
      console.error("Gagal logout:", error);
      alert("Gagal keluar dari akun.");
    }
  };

  const filteredLogs = logs.filter(log => log.tipe_absen === activeTab);

  return (
    <div className="min-h-screen bg-gray-50 font-sans relative overflow-x-hidden">
      
      {/* Header */}
      <header className="bg-[#050B20] text-white p-4 flex justify-between items-center relative z-20">
        <div className="font-bold text-xl flex items-center gap-2">
          <span className="text-blue-400">⚡</span> AppAbsensi
        </div>
        <button 
          onClick={() => setIsMenuOpen(true)}
          className="bg-white text-black px-3 py-1 rounded cursor-pointer hover:bg-gray-200 transition"
        >
          ☰
        </button>
      </header>

      {/* --- BAGIAN SIDEBAR MENU --- */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
          onClick={() => setIsMenuOpen(false)}
        ></div>
      )}

      <div 
        className={`fixed top-0 right-0 h-full w-64 bg-[#1a1c23] text-white z-50 flex flex-col transform transition-transform duration-300 ease-in-out ${
          isMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-5 border-b border-gray-700 flex justify-between items-center">
          <span className="font-bold text-lg">Menu</span>
          <button 
            onClick={() => setIsMenuOpen(false)}
            className="text-gray-400 hover:text-white text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <nav className="flex-1 p-5 flex flex-col gap-6 mt-2">
          <Link href="/dashboard" className="text-gray-300 hover:text-white transition-colors">Home</Link>
          <Link href="/data-absensi" className="text-white font-semibold transition-colors">Data Absensi</Link>
          <Link href="/data-visit" className="text-gray-300 hover:text-white transition-colors">Data Visit</Link>
        </nav>

        <div className="p-5 mt-auto mb-4">
          <button 
            onClick={handleLogout}
            className="w-full text-left font-bold text-gray-300 hover:text-red-400 transition-colors"
          >
            Keluar
          </button>
        </div>
      </div>

      {/* Konten Utama (Tabel) */}
      <main className="max-w-6xl mx-auto p-6 relative z-10">
        <h1 className="text-3xl font-light text-center my-8 text-gray-800">Data Absensi</h1>

        <div className="bg-white shadow-sm border rounded-md overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b">
            <button 
              onClick={() => setActiveTab('Absen Masuk')}
              className={`flex-1 py-4 text-sm font-semibold transition-colors ${activeTab === 'Absen Masuk' ? 'bg-[#050B20] text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
            >
              Absensi Masuk
            </button>
            <button 
              onClick={() => setActiveTab('Absen Pulang')}
              className={`flex-1 py-4 text-sm font-semibold transition-colors ${activeTab === 'Absen Pulang' ? 'bg-[#050B20] text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
            >
              Absensi Pulang
            </button>
          </div>

          {/* Tabel */}
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-10 text-center text-gray-500">Memuat data...</div>
            ) : (
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead className="bg-[#f8fcfc] border-b border-gray-200">
                  <tr>
                    <th className="p-4 font-semibold text-sm text-gray-700">Tanggal ↓</th>
                    <th className="p-4 font-semibold text-sm text-gray-700">Jam</th>
                    <th className="p-4 font-semibold text-sm text-gray-700">Status / Telat</th>
                    <th className="p-4 font-semibold text-sm text-gray-700">Lokasi</th> {/* KOLOM BARU */}
                    <th className="p-4 font-semibold text-sm text-gray-700">Bukti Foto</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.length > 0 ? (
                    filteredLogs.map((log) => {
                      const tgl = log.waktuObj.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
                      const jam = log.waktuObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                      
                      return (
                        <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="p-4 text-sm text-gray-800">{tgl}</td>
                          <td className="p-4 text-sm text-gray-800">{jam}</td>
                          <td className="p-4 text-sm text-gray-800">00:00:00</td>
                          
                          {/* MENAMPILKAN LOKASI */}
                          <td className="p-4 text-sm text-gray-800">
                            {log.lokasi ? (
                              <a 
                                href={`https://www.google.com/maps?q=${log.lokasi}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:underline"
                              >
                                {log.lokasi}
                              </a>
                            ) : (
                              <span className="text-gray-400 text-xs">Tidak ada GPS</span>
                            )}
                          </td>

                          <td className="p-4 text-sm text-blue-600 underline">
                            <a href={log.foto_url} target="_blank" rel="noopener noreferrer">Lihat Foto</a>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      {/* colSpan diubah menjadi 5 karena ada tambahan kolom Lokasi */}
                      <td colSpan="5" className="p-8 text-center text-gray-500">
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