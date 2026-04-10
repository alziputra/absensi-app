'use client'
import { useState, useRef, useEffect } from 'react';
import { db, storage, auth } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { onAuthStateChanged, signOut } from 'firebase/auth'; // Tambahkan signOut
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import imageCompression from 'browser-image-compression';

export default function Dashboard() {
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");
  const [absenType, setAbsenType] = useState(""); 
  const [isLoading, setIsLoading] = useState(false); 
  const [loadingMsg, setLoadingMsg] = useState(""); // State untuk pesan loading
  const fileInputRef = useRef(null);
  const router = useRouter();

  // Proteksi Halaman: Cek apakah user sudah login
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push('/'); 
      }
    });
    return () => unsubscribe();
  }, [router]);

  // Update Jam secara realtime
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setTime(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
      setDate(now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleAbsenClick = (type) => {
    setAbsenType(type);
    fileInputRef.current.click();
  };

  const handlePhotoCapture = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsLoading(true); 
    setLoadingMsg(`Memproses ${absenType}...`); // Tampilkan pesan di layar, bukan alert

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Anda belum login!");

      // --- 1. SIAPKAN PENCARI GPS (TANPA AWAIT DULU) ---
      const getGPS = new Promise((resolve) => {
        if (!navigator.geolocation) return resolve("GPS Tidak Didukung");
        
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve(`${pos.coords.latitude},${pos.coords.longitude}`),
          () => resolve("Gagal mendapat GPS"),
          { 
            enableHighAccuracy: true, 
            timeout: 7000,        // Maksimal tunggu GPS 7 detik saja
            maximumAge: 30000     // Boleh pakai data GPS dari 30 detik terakhir agar cepat
          }
        );
      });

      // --- 2. SIAPKAN KOMPRESI FOTO (TANPA AWAIT DULU) ---
      const options = { 
        maxSizeMB: 0.5,         // Turunkan jadi 500 KB saja sudah cukup tajam
        maxWidthOrHeight: 800,  // Dimensi diturunkan agar kompresi instan
        useWebWorker: true 
      };
      const compressImage = imageCompression(file, options);

      // --- 3. JALANKAN GPS & KOMPRESI BERSAMAAN (PARALEL) ---
      // Ini rahasia utama agar aplikasi terasa 2x lipat lebih cepat
      const [lokasiAbsen, compressedFile] = await Promise.all([getGPS, compressImage]);

      setLoadingMsg("Mengunggah data...");

      // --- 4. UPLOAD KE STORAGE ---
      const storageRef = ref(storage, `absensi/${user.uid}/${Date.now()}_${compressedFile.name}`);
      await uploadBytes(storageRef, compressedFile);
      const photoURL = await getDownloadURL(storageRef);

      // --- 5. SIMPAN KE FIRESTORE ---
      await addDoc(collection(db, "absensi_logs"), {
        userId: user.uid,
        tipe_absen: absenType,
        waktu: serverTimestamp(),
        foto_url: photoURL,
        lokasi: lokasiAbsen
      });

      setLoadingMsg(`Sukses! ${absenType} berhasil.`);
      setTimeout(() => setLoadingMsg(""), 3000); // Pesan sukses hilang otomatis dalam 3 detik
      
    } catch (error) {
      console.error("Error absensi:", error);
      alert("Gagal melakukan absensi. Pastikan koneksi internet stabil.");
      setLoadingMsg("");
    } finally {
      setIsLoading(false); 
      if (fileInputRef.current) fileInputRef.current.value = ""; 
    }
  };

  // Fungsi Logout untuk menu bawah
  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/');
    } catch (error) {
      console.error("Gagal logout:", error);
      alert("Gagal keluar dari akun.");
    }
  };

  return (
    <div className="min-h-screen bg-white relative overflow-x-hidden flex flex-col items-center pt-10 pb-28 font-sans">
      
      {/* Dekorasi Background Bubbles (Berdasarkan desain) */}
      <div className="absolute top-0 left-0 w-24 h-64 bg-[#0aa5ff] rounded-br-full -z-10"></div>
      <div className="absolute top-40 right-10 w-6 h-6 bg-[#0aa5ff] rounded-full -z-10"></div>
      <div className="absolute top-[28rem] right-[-2rem] w-32 h-32 bg-[#0aa5ff] rounded-full -z-10"></div>
      <div className="absolute top-[45rem] right-16 w-8 h-8 bg-[#0aa5ff] rounded-full -z-10"></div>
      <div className="absolute bottom-32 left-4 w-6 h-6 bg-[#0aa5ff] rounded-full -z-10"></div>

      {/* Header Nama & Jam */}
      <div className="text-center z-10 mb-8 mt-4">
        <h2 className="text-xl font-semibold text-gray-800">Alzi Rahmana Putra</h2>
        <h1 className="text-6xl font-bold text-gray-800 my-2">{time}</h1>
        <p className="text-gray-400 text-lg">{date}</p>
      </div>
      {/* Loading Message */}
      {loadingMsg && (
        <div className="bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-semibold inline-block animate-pulse shadow-sm">
          {loadingMsg}
        </div>
      )}

      {/* Input File Tersembunyi untuk Kamera */}
      <input 
        type="file" 
        accept="image/jpeg, image/png, image/jpg" 
        capture="environment" 
        ref={fileInputRef} 
        onChange={handlePhotoCapture} 
        className="hidden" 
      />

      {/* Kontainer Tombol */}
      <div className="flex flex-col gap-6 z-10">
        {/* Tombol Absen Masuk */}
        <button 
          onClick={() => handleAbsenClick('Absen Masuk')}
          disabled={isLoading}
          className={`w-48 h-48 rounded-full bg-gradient-to-b from-yellow-300 via-orange-300 to-orange-400 flex flex-col items-center justify-center text-white shadow-xl transition-transform ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
        >
          <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"></path></svg>
          <span className="font-bold tracking-wide">ABSEN<br/>MASUK</span>
        </button>

        {/* Tombol Absen Pulang */}
        <button 
          onClick={() => handleAbsenClick('Absen Pulang')}
          disabled={isLoading}
          className={`w-48 h-48 rounded-full bg-gradient-to-b from-pink-400 to-purple-500 flex flex-col items-center justify-center text-white shadow-xl transition-transform ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
        >
          <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"></path></svg>
          <span className="font-bold tracking-wide">ABSEN<br/>PULANG</span>
        </button>

        {/* Tombol Visit Masuk */}
        <button 
          onClick={() => handleAbsenClick('Visit Masuk')}
          disabled={isLoading}
          className={`w-48 h-48 rounded-full bg-gradient-to-b from-blue-400 to-indigo-500 flex flex-col items-center justify-center text-white shadow-xl transition-transform ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
        >
          <svg className="w-14 h-14 mb-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path><path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-4m0 0l-2 2m2-2l2 2"></path></svg>
          <span className="font-bold tracking-wide">VISIT<br/>MASUK</span>
        </button>

        {/* Tombol Visit Keluar (BARU) */}
        <button 
          onClick={() => handleAbsenClick('Visit Keluar')}
          disabled={isLoading}
          className={`w-48 h-48 rounded-full bg-gradient-to-b from-[#6ee7b7] to-[#22d3ee] flex flex-col items-center justify-center text-white shadow-xl transition-transform ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
        >
          <svg className="w-14 h-14 mb-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path><path strokeLinecap="round" strokeLinejoin="round" d="M12 12v4m0 0l-2-2m2 2l2-2"></path></svg>
          <span className="font-bold tracking-wide">VISIT<br/>KELUAR</span>
        </button>
      </div>

      {/* --- BOTTOM NAVIGATION BAR (BARU) --- */}
      <nav className="fixed bottom-0 w-full bg-[#050B20] text-gray-300 py-3 rounded-t-2xl flex justify-around items-center z-50">
        {/* Link Data Absensi */}
        <Link href="/data-absensi" className="flex flex-col items-center hover:text-white transition">
          <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 11l3 3L22 4"></path>
          </svg>
          <span className="text-[10px]">Data Absensi</span>
        </Link>

        {/* Link Data Visit */}
        <Link href="/data-visit" className="flex flex-col items-center hover:text-white transition">
          <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 11l3 3L22 4"></path>
          </svg>
          <span className="text-[10px]">Data Visit</span>
        </Link>

        {/* Tombol Logout */}
        <button onClick={handleLogout} className="flex flex-col items-center hover:text-red-400 transition">
          <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
          </svg>
          <span className="text-[10px]">Logout</span>
        </button>
      </nav>

    </div>
  );
}