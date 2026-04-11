'use client'
import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function DataVisit() {
  const [logs, setLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('Visit Masuk');
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
    }
  };

  // --- FUNGSI EXPORT EXCEL/CSV KHUSUS VISIT ---
  const handleExportCSV = () => {
    if (logs.length === 0) return alert("Tidak ada data untuk diexport!");

    const groupedData = {};

    logs.forEach(log => {
      if (log.tipe_absen !== 'Visit Masuk' && log.tipe_absen !== 'Visit Keluar') return;

      const tgl = log.waktuObj.toLocaleDateString('id-ID').replace(/\//g, '-');
      // Karena 1 hari bisa banyak cabang, kita buat pengelompokkan berdasarkan Tanggal + Cabang
      const key = `${tgl}_${log.cabang}`; 
      
      if (!groupedData[key]) {
        groupedData[key] = {
          tanggal: tgl,
          cabang: log.cabang || "-",
          masuk: "-",
          lokasiMasuk: "-",
          keluar: "-",
          lokasiKeluar: "-"
        };
      }

      if (log.tipe_absen === 'Visit Masuk') {
        groupedData[key].masuk = log.waktuObj.toLocaleTimeString('id-ID');
        groupedData[key].lokasiMasuk = log.lokasi || "Tanpa GPS";
      } else if (log.tipe_absen === 'Visit Keluar') {
        groupedData[key].keluar = log.waktuObj.toLocaleTimeString('id-ID');
        groupedData[key].lokasiKeluar = log.lokasi || "Tanpa GPS";
      }
    });

    const headers = ["Tanggal", "Cabang/Outlet", "Jam Visit Masuk", "Lokasi Masuk", "Jam Visit Keluar", "Lokasi Keluar"];
    const csvRows = ['\uFEFF' + headers.join(',')]; 

    Object.values(groupedData).forEach(row => {
      const csvLine = [
        row.tanggal,
        `"${row.cabang}"`,
        row.masuk,
        `"${row.lokasiMasuk}"`,
        row.keluar,
        `"${row.lokasiKeluar}"`
      ];
      csvRows.push(csvLine.join(','));
    });

    const csvData = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const csvUrl = URL.createObjectURL(csvData);
    const link = document.createElement('a');
    link.href = csvUrl;
    link.download = `Laporan_Visit_Lengkap_${new Date().toLocaleDateString('id-ID')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredLogs = logs.filter(log => log.tipe_absen === activeTab);

  return (
    <div className="min-h-screen bg-gray-50 font-sans relative overflow-x-hidden pb-20">
      
      <header className="bg-[#050B20] text-white p-4 flex justify-between items-center relative z-20">
        <div className="font-bold text-xl flex items-center gap-2">
          <span className="text-blue-400">⚡</span> AppAbsensi
        </div>
        <button onClick={() => setIsMenuOpen(true)} className="bg-white text-black px-3 py-1 rounded cursor-pointer hover:bg-gray-200 transition">
          ☰
        </button>
      </header>

      {/* Sidebar Menu */}
      {isMenuOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setIsMenuOpen(false)}></div>}
      <div className={`fixed top-0 right-0 h-full w-64 bg-[#1a1c23] text-white z-50 flex flex-col transform transition-transform duration-300 ease-in-out ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-5 border-b border-gray-700 flex justify-between items-center">
          <span className="font-bold text-lg">Menu</span>
          <button onClick={() => setIsMenuOpen(false)} className="text-gray-400 hover:text-white text-2xl leading-none">×</button>
        </div>
        <nav className="flex-1 p-5 flex flex-col gap-6 mt-2">
          <Link href="/dashboard" className="text-gray-300 hover:text-white transition-colors">Home</Link>
          <Link href="/data-absensi" className="text-gray-300 hover:text-white transition-colors">Data Absensi</Link>
          <Link href="/data-visit" className="text-white font-semibold transition-colors">Data Visit</Link>
        </nav>
        <div className="p-5 mt-auto mb-4">
          <button onClick={handleLogout} className="w-full text-left font-bold text-gray-300 hover:text-red-400 transition-colors">Keluar</button>
        </div>
      </div>

      <main className="max-w-6xl mx-auto p-6 relative z-10">
        
        {/* Judul & Tombol Export */}
        <div className="flex flex-col sm:flex-row justify-between items-center my-8 gap-4">
          <h1 className="text-3xl font-light text-gray-800">Data Visit</h1>
          
          <button 
            onClick={handleExportCSV}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 text-sm transition-colors shadow-sm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
            Export to Excel
          </button>
        </div>

        <div className="bg-white shadow-sm border rounded-md overflow-hidden">
          <div className="flex border-b">
            <button 
              onClick={() => setActiveTab('Visit Masuk')}
              className={`flex-1 py-4 text-sm font-semibold transition-colors ${activeTab === 'Visit Masuk' ? 'bg-[#050B20] text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
            >
              Visit Masuk
            </button>
            <button 
              onClick={() => setActiveTab('Visit Keluar')}
              className={`flex-1 py-4 text-sm font-semibold transition-colors ${activeTab === 'Visit Keluar' ? 'bg-[#050B20] text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
            >
              Visit Keluar
            </button>
          </div>

          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-10 text-center text-gray-500">Memuat data...</div>
            ) : (
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead className="bg-[#f8fcfc] border-b border-gray-200">
                  <tr>
                    <th className="p-4 font-semibold text-sm text-gray-700">Tanggal ↓</th>
                    <th className="p-4 font-semibold text-sm text-gray-700">Jam</th>
                    <th className="p-4 font-semibold text-sm text-gray-700">Cabang / Outlet</th>
                    <th className="p-4 font-semibold text-sm text-gray-700">Lokasi GPS</th>
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
                          <td className="p-4 text-sm text-gray-800 font-medium">{jam}</td>
                          <td className="p-4 text-sm text-gray-800 font-semibold">{log.cabang || '-'}</td>
                          
                          <td className="p-4 text-sm text-gray-800">
                            {log.lokasi && !log.lokasi.includes("Tanpa") && !log.lokasi.includes("Gagal") ? (
                              <a 
                                href={`https://maps.google.com/?q=${log.lokasi}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:underline"
                              >
                                Lihat Map
                              </a>
                            ) : (
                              <span className="text-gray-400 text-xs">Tanpa GPS</span>
                            )}
                          </td>

                          <td className="p-4 text-sm">
                            {log.foto_url && log.foto_url !== "-" ? (
                              <a href={log.foto_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">
                                Lihat Foto
                              </a>
                            ) : (
                              <span className="text-gray-400 text-xs">Tanpa Foto</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
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