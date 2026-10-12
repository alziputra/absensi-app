"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RegisterRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/?tab=register");
  }, [router]);

  return (
    <div className="min-h-screen bg-[#050B20] text-white flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-10 h-10 border-4 border-blue-400/30 border-t-blue-500 rounded-full animate-spin mb-4" />
      <p className="text-sm font-semibold text-slate-300">
        Membuka Formulir Register & Aktivasi NIK...
      </p>
    </div>
  );
}
