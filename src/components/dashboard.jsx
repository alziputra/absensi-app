'use client'
import { useState, useRef, useEffect } from 'react';
import { db, storage, auth } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import imageCompression from 'browser-image-compression';

export default function Dashboard() {
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");
  const [userName, setUserName] = useState("Memuat...");
  const [absenType, setAbsenType] = useState(""); 
  const [isLoading, setIsLoading] = useState(false); 
  const [loadingMsg, setLoadingMsg] = useState("");
  
  // --- STATE BARU UNTUK POPUP VISIT ---
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [visitType, setVisitType] = useState(""); // Menyimpan apakah ini Visit Masuk atau Keluar
  const [namaCabang, setNamaCabang] = useState("");

  const fileInputRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) router.push('/'); 
      else {
        if (user.displayName) setUserName(user.displayName);
        else if (user.email) {
          const namaDariEmail = user.email.split('@')[0];
          setUserName(namaDariEmail.charAt(0).toUpperCase() + namaDariEmail.slice(1));
        }
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setTime(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setDate(now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const checkAbsenMasukHariIni = async (uid) => {
    const q = query(collection(db, "absensi_logs"), where("userId", "==", uid), where("tipe_absen", "==", "Absen Masuk"));
    const snapshot = await getDocs(q);
    const todayStr = new Date().toDateString();
    return snapshot.docs.some(doc => {
      const docDate = doc.data().waktu?.toDate();
      return docDate && docDate.toDateString() === todayStr;
    });
  };

  // 1. Fungsi Utama saat salah satu dari 4 tombol diklik
  const handleAbsenClick = async (type) => {
    const user = auth.currentUser;
    if (!user) return alert("Sesi login tidak valid!");

    // Cek Absen Pulang
    if (type === 'Absen Pulang') {
      setIsLoading(true); setLoadingMsg("Mengecek data...");
      const sudahAbsenMasuk = await checkAbsenMasukHariIni(user.uid);
      setIsLoading(false); setLoadingMsg("");
      if (!sudahAbsenMasuk) {
        alert("Peringatan: Anda belum Absen Masuk hari ini!");
        return; 
      }
    }

    // LOGIKA POPUP VISIT: Jika tombol yang diklik mengandung kata "Visit"
    if (type.includes('Visit')) {
      setVisitType(type);       // Simpan jenis visitnya
      setNamaCabang("");        // Kosongkan kolom input
      setShowVisitModal(true);  // Tampilkan Popup
      return;                   // Hentikan proses, biarkan popup bekerja
    }

    // Jika Absen Masuk / Pulang Biasa, langsung buka kamera
    setAbsenType(type);
    fileInputRef.current.click();
  };

  // 2. Fungsi saat Popup Visit di-submit
  const handleVisitSubmit = (e) => {
    e.preventDefault();
    if (!namaCabang.trim()) return alert("Nama Cabang / Outlet wajib diisi!");
    
    setShowVisitModal(false); // Tutup Popup
    setAbsenType(visitType);  // Set tipe absen agar terbaca di fungsi kamera/keluar

    if (visitType === 'Visit Masuk') {
      // Visit Masuk -> Lanjut buka kamera
      fileInputRef.current.click(); 
    } else if (visitType === 'Visit Keluar') {
      // Visit Keluar -> Proses tanpa foto
      processVisitKeluarTanpaFoto();
    }
  };

  // 3. Fungsi Khusus Visit Keluar (Ambil GPS tanpa upload foto)
  const processVisitKeluarTanpaFoto = async () => {
    setIsLoading(true); 
    setLoadingMsg(`Memproses Visit Keluar ${namaCabang}...`);
    try {
      const user = auth.currentUser;
      const getGPS = new Promise((resolve) => {
        if (!navigator.geolocation) return resolve("Tanpa GPS");
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve(`${pos.coords.latitude},${pos.coords.longitude}`),
          () => resolve("Gagal mendapat GPS"),
          { enableHighAccuracy: true, timeout: 7000, maximumAge: 30000 }
        );
      });
      const lokasiAbsen = await getGPS;

      await addDoc(collection(db, "absensi_logs"), {
        userId: user.uid,
        tipe_absen: "Visit Keluar",
        waktu: serverTimestamp(),
        foto_url: "-", // Tidak butuh foto
        lokasi: lokasiAbsen,
        cabang: namaCabang, // Simpan nama cabang
        status_kehadiran: "-",
        detail_keterlambatan: "-"
      });

      setLoadingMsg(`Sukses! Visit Keluar cabang ${namaCabang} dicatat.`);
      setTimeout(() => setLoadingMsg(""), 3000); 
    } catch (error) {
      console.error(error);
      alert("Gagal melakukan Visit Keluar.");
    } finally {
      setIsLoading(false);
      setLoadingMsg("");
    }
  };

  // 4. Fungsi Kamera Bawaan (Untuk Absen Biasa & Visit Masuk)
  const handlePhotoCapture = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsLoading(true); setLoadingMsg(`Memproses ${absenType}...`); 
    try {
      const user = auth.currentUser;
      const getGPS = new Promise((resolve) => {
        if (!navigator.geolocation) return resolve("Tanpa GPS");
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve(`${pos.coords.latitude},${pos.coords.longitude}`),
          () => resolve("Gagal mendapat GPS"),
          { enableHighAccuracy: true, timeout: 7000, maximumAge: 30000 }
        );
      });

      const options = { maxSizeMB: 0.5, maxWidthOrHeight: 800, useWebWorker: true };
      const compressImage = imageCompression(file, options);
      const [lokasiAbsen, compressedFile] = await Promise.all([getGPS, compressImage]);

      setLoadingMsg("Mengunggah data...");
      const storageRef = ref(storage, `absensi/${user.uid}/${Date.now()}_${compressedFile.name}`);
      await uploadBytes(storageRef, compressedFile);
      const photoURL = await getDownloadURL(storageRef);

      let statusTelat = "Tepat Waktu"; let detailTelat = "-";
      if (absenType === 'Absen Masuk') {
        const batasJam = new Date(); batasJam.setHours(8, 0, 0, 0); 
        if (new Date() > batasJam) {
          statusTelat = "Terlambat";
          const diffMs = new Date() - batasJam;
          detailTelat = `${Math.floor(diffMs / 3600000)} Jam ${Math.floor((diffMs % 3600000) / 60000)} Menit`;
        }
      }

      await addDoc(collection(db, "absensi_logs"), {
        userId: user.uid,
        tipe_absen: absenType,
        waktu: serverTimestamp(),
        foto_url: photoURL,
        lokasi: lokasiAbsen,
        cabang: absenType.includes("Visit") ? namaCabang : "-", // Simpan Cabang jika ini Visit Masuk
        status_kehadiran: statusTelat, 
        detail_keterlambatan: detailTelat 
      });

      setLoadingMsg(`Sukses! ${absenType} dicatat.`);
      setTimeout(() => setLoadingMsg(""), 3000); 
    } catch (error) {
      alert("Gagal absen. Pastikan internet menyala.");
    } finally {
      setIsLoading(false); 
      if (fileInputRef.current) fileInputRef.current.value = ""; 
    }
  };

  const handleLogout = async () => {
    try { await signOut(auth); router.push('/'); } catch (error) { console.error(error); }
  };

  return (
    <div className="min-h-screen bg-white relative overflow-x-hidden flex flex-col items-center pt-10 pb-28 font-sans">
      
      {/* POPUP / MODAL VISIT */}
      {showVisitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="fixed inset-0 bg-black opacity-60" onClick={() => setShowVisitModal(false)}></div>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm z-50 animate-fade-in-up">
            <h3 className="text-xl font-bold text-gray-800 mb-2">Form {visitType}</h3>
            <p className="text-gray-500 text-sm mb-4">
              Silahkan isi nama Cabang/Outlet yang sedang Anda kunjungi.
            </p>
            <form onSubmit={handleVisitSubmit}>
              <input 
                type="text" 
                placeholder="Cabang / Outlet" 
                value={namaCabang}
                onChange={(e) => setNamaCabang(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 text-black mb-4 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
                autoFocus
              />
              <div className="flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowVisitModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  {visitType === 'Visit Masuk' ? 'Buka Kamera' : 'Simpan Keluar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* --- AKHIR MODAL --- */}

      <div className="absolute top-0 left-0 w-24 h-64 bg-[#0aa5ff] rounded-br-full -z-10"></div>
      <div className="absolute top-40 right-10 w-6 h-6 bg-[#0aa5ff] rounded-full -z-10"></div>
      <div className="absolute top-[28rem] right-[-2rem] w-32 h-32 bg-[#0aa5ff] rounded-full -z-10"></div>
      
      <div className="text-center z-10 mb-8 mt-4">
        <h2 className="text-xl font-semibold text-gray-800">{userName}</h2>
        <h1 className="text-5xl font-bold text-gray-800 my-2">{time}</h1>
        <p className="text-gray-500 text-sm mb-4">{date}</p>
        
        {loadingMsg && (
          <div className="bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-semibold inline-block animate-pulse shadow-sm">
            {loadingMsg}
          </div>
        )}
      </div>

      <input type="file" accept="image/jpeg, image/png, image/jpg" capture="environment" ref={fileInputRef} onChange={handlePhotoCapture} className="hidden" />

      <div className="flex flex-col gap-6 z-10 pb-8">
        <button onClick={() => handleAbsenClick('Absen Masuk')} disabled={isLoading} className={`w-48 h-48 rounded-full bg-gradient-to-b from-yellow-300 via-orange-300 to-orange-400 flex flex-col items-center justify-center text-white shadow-xl transition-transform ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}>
          <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"></path></svg>
          <span className="font-bold tracking-wide">ABSEN<br/>MASUK</span>
        </button>

        <button onClick={() => handleAbsenClick('Absen Pulang')} disabled={isLoading} className={`w-48 h-48 rounded-full bg-gradient-to-b from-pink-400 to-purple-500 flex flex-col items-center justify-center text-white shadow-xl transition-transform ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}>
          <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"></path></svg>
          <span className="font-bold tracking-wide">ABSEN<br/>PULANG</span>
        </button>

        <button onClick={() => handleAbsenClick('Visit Masuk')} disabled={isLoading} className={`w-48 h-48 rounded-full bg-gradient-to-b from-blue-400 to-indigo-500 flex flex-col items-center justify-center text-white shadow-xl transition-transform ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}>
          <svg className="w-14 h-14 mb-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path><path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-4m0 0l-2 2m2-2l2 2"></path></svg>
          <span className="font-bold tracking-wide">VISIT<br/>MASUK</span>
        </button>

        <button onClick={() => handleAbsenClick('Visit Keluar')} disabled={isLoading} className={`w-48 h-48 rounded-full bg-gradient-to-b from-[#6ee7b7] to-[#22d3ee] flex flex-col items-center justify-center text-white shadow-xl transition-transform ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}>
          <svg className="w-14 h-14 mb-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path><path strokeLinecap="round" strokeLinejoin="round" d="M12 12v4m0 0l-2-2m2 2l2-2"></path></svg>
          <span className="font-bold tracking-wide">VISIT<br/>KELUAR</span>
        </button>
      </div>

      <nav className="fixed bottom-0 w-full bg-[#050B20] text-gray-300 py-3 rounded-t-2xl flex justify-around items-center z-50">
        <Link href="/data-absensi" className="flex flex-col items-center hover:text-white transition">
          <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path><path strokeLinecap="round" strokeLinejoin="round" d="M9 11l3 3L22 4"></path></svg>
          <span className="text-[10px]">Data Absensi</span>
        </Link>
        <Link href="/data-visit" className="flex flex-col items-center hover:text-white transition">
          <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path><path strokeLinecap="round" strokeLinejoin="round" d="M9 11l3 3L22 4"></path></svg>
          <span className="text-[10px]">Data Visit</span>
        </Link>
        <button onClick={handleLogout} className="flex flex-col items-center hover:text-red-400 transition">
          <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
          <span className="text-[10px]">Logout</span>
        </button>
      </nav>
    </div>
  );
}