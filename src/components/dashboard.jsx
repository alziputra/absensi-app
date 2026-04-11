'use client'
import { useState, useRef, useEffect } from 'react';
import { db, storage, auth } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import imageCompression from 'browser-image-compression';
import { ADMIN_EMAILS } from '@/constants'; 

export default function Dashboard() {
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");
  const [userName, setUserName] = useState("Memuat...");
  const [absenType, setAbsenType] = useState(""); 
  const [isLoading, setIsLoading] = useState(false); 
  const [loadingMsg, setLoadingMsg] = useState("");
  
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [visitType, setVisitType] = useState(""); 
  const [namaCabang, setNamaCabang] = useState("");
  const [isAdmin, setIsAdmin] = useState(false); 

  const fileInputRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) router.push('/'); 
      else {
        if (ADMIN_EMAILS.includes(user.email)) setIsAdmin(true);
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

  // --- FUNGSI BARU: CEK ABSEN UNIVERSAL (Bisa ngecek Masuk atau Pulang) ---
  const checkAbsenHariIni = async (uid, tipeAbsen) => {
    const q = query(
      collection(db, "absensi_logs"), 
      where("userId", "==", uid), 
      where("tipe_absen", "==", tipeAbsen)
    );
    const snapshot = await getDocs(q);
    const todayStr = new Date().toDateString();
    
    return snapshot.docs.some(doc => {
      const docDate = doc.data().waktu?.toDate();
      return docDate && docDate.toDateString() === todayStr;
    });
  };

  const handleAbsenClick = async (type) => {
    const user = auth.currentUser;
    if (!user) return alert("Sesi login tidak valid!");

    setIsLoading(true); 
    setLoadingMsg(`Mengecek status ${type}...`);

    // 1. CEK ANTI-DOBEL UNTUK ABSEN MASUK
    if (type === 'Absen Masuk') {
      const sudahMasuk = await checkAbsenHariIni(user.uid, 'Absen Masuk');
      if (sudahMasuk) {
        setIsLoading(false); setLoadingMsg("");
        return alert("Anda sudah melakukan Absen Masuk hari ini! Tidak perlu absen ganda.");
      }
    }

    // 2. CEK ANTI-DOBEL UNTUK ABSEN PULANG
    if (type === 'Absen Pulang') {
      const sudahMasuk = await checkAbsenHariIni(user.uid, 'Absen Masuk');
      if (!sudahMasuk) {
        setIsLoading(false); setLoadingMsg("");
        return alert("Peringatan: Anda belum Absen Masuk hari ini!");
      }

      const sudahPulang = await checkAbsenHariIni(user.uid, 'Absen Pulang');
      if (sudahPulang) {
        setIsLoading(false); setLoadingMsg("");
        return alert("Anda sudah melakukan Absen Pulang hari ini! Silahkan istirahat.");
      }
    }

    // Matikan loading karena pengecekan database sudah selesai
    setIsLoading(false); 
    setLoadingMsg("");

    // 3. LOGIKA POPUP VISIT (Tetap dibiarkan tanpa batas)
    if (type.includes('Visit')) {
      setVisitType(type);       
      setNamaCabang("");        
      setShowVisitModal(true);  
      return;                   
    }

    // Lolos semua pengecekan, buka kamera!
    setAbsenType(type);
    fileInputRef.current.click();
  };

  const handleVisitSubmit = (e) => {
    e.preventDefault();
    if (!namaCabang.trim()) return alert("Nama Cabang / Outlet wajib diisi!");
    
    setShowVisitModal(false); 
    setAbsenType(visitType);  

    if (visitType === 'Visit Masuk') fileInputRef.current.click(); 
    else if (visitType === 'Visit Keluar') processVisitKeluarTanpaFoto();
  };

  const processVisitKeluarTanpaFoto = async () => {
    setIsLoading(true); setLoadingMsg(`Memproses Keluar ${namaCabang}...`);
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
        email: user.email,
        nama: userName,
        tipe_absen: "Visit Keluar",
        waktu: serverTimestamp(),
        foto_url: "-", 
        lokasi: lokasiAbsen,
        cabang: namaCabang, 
        status_kehadiran: "-",
        detail_keterlambatan: "-"
      });

      setLoadingMsg(`Sukses! Visit Keluar ${namaCabang} dicatat.`);
      setTimeout(() => { setLoadingMsg(""); setIsLoading(false); }, 2500); 
    } catch (error) {
      alert("Gagal melakukan Visit Keluar.");
      setIsLoading(false); setLoadingMsg("");
    }
  };

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

      setLoadingMsg("Mengunggah foto...");
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
        email: user.email,
        nama: userName,
        tipe_absen: absenType,
        waktu: serverTimestamp(),
        foto_url: photoURL,
        lokasi: lokasiAbsen,
        cabang: absenType.includes("Visit") ? namaCabang : "-", 
        status_kehadiran: statusTelat, 
        detail_keterlambatan: detailTelat 
      });

      setLoadingMsg(`Sukses! ${absenType} dicatat.`);
      setTimeout(() => { setLoadingMsg(""); setIsLoading(false); }, 2500); 
    } catch (error) {
      alert("Gagal absen. Pastikan internet menyala.");
      setIsLoading(false); setLoadingMsg("");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ""; 
    }
  };

  const handleLogout = async () => {
    try { await signOut(auth); router.push('/'); } catch (error) { console.error(error); }
  };

  return (
    <div className="min-h-screen bg-white relative overflow-x-hidden flex flex-col items-center pt-10 pb-28 font-sans">
      
      {/* POPUP LOADING & SUKSES */}
      {loadingMsg && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black bg-opacity-40 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-2xl shadow-2xl p-6 flex flex-col items-center max-w-[250px] text-center transform animate-fade-in-up">
            {loadingMsg.includes("Sukses") ? (
              <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path></svg>
              </div>
            ) : (
              <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-4"></div>
            )}
            <h3 className="text-lg font-bold text-gray-800">{loadingMsg.includes("Sukses") ? "Berhasil!" : "Mohon Tunggu"}</h3>
            <p className="text-gray-500 text-sm mt-1">{loadingMsg}</p>
          </div>
        </div>
      )}

      {/* MODAL INPUT VISIT */}
      {showVisitModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
          <div className="fixed inset-0 bg-black bg-opacity-60" onClick={() => setShowVisitModal(false)}></div>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm z-[70] animate-fade-in-up">
            <h3 className="text-xl font-bold text-gray-800 mb-2">Form {visitType}</h3>
            <p className="text-gray-500 text-sm mb-4">Silahkan isi nama Cabang/Outlet yang sedang Anda kunjungi.</p>
            <form onSubmit={handleVisitSubmit}>
              <input 
                type="text" 
                placeholder="Contoh: Toko Makmur Jaya" 
                value={namaCabang}
                onChange={(e) => setNamaCabang(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 text-black mb-4 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required autoFocus
              />
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowVisitModal(false)} className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300">Batal</button>
                <button type="submit" className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700">{visitType === 'Visit Masuk' ? 'Buka Kamera' : 'Simpan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dekorasi Background */}
      <div className="absolute top-0 left-0 w-24 h-64 bg-[#0aa5ff] rounded-br-full -z-10"></div>
      <div className="absolute top-40 right-10 w-6 h-6 bg-[#0aa5ff] rounded-full -z-10"></div>
      <div className="absolute top-[28rem] right-[-2rem] w-32 h-32 bg-[#0aa5ff] rounded-full -z-10"></div>
      
      {/* Header Nama & Jam */}
      <div className="text-center z-10 mb-8 mt-4">
        <h2 className="text-xl font-semibold text-gray-800">{userName}</h2>
        <h1 className="text-5xl font-bold text-gray-800 my-2">{time}</h1>
        <p className="text-gray-500 text-sm mb-4">{date}</p>
      </div>

      <input type="file" accept="image/jpeg, image/png, image/jpg" capture="environment" ref={fileInputRef} onChange={handlePhotoCapture} className="hidden" />

      {/* Tombol Absen & Visit */}
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

        {isAdmin && (
          <Link href="/admin" className="flex flex-col items-center text-yellow-400 hover:text-yellow-300 transition">
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
            <span className="text-[10px] font-bold">Admin Panel</span>
          </Link>
        )}

        <button onClick={handleLogout} className="flex flex-col items-center hover:text-red-400 transition">
          <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
          <span className="text-[10px]">Logout</span>
        </button>
      </nav>
    </div>
  );
}