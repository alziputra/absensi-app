"use client";

import Link from "next/link";
import { logoutUser } from "@/services/authService";
import { useRouter } from "next/navigation";

interface BottomNavProps {
  isAdmin?: boolean;
}

export default function BottomNav({ isAdmin = false }: BottomNavProps) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logoutUser();
      router.push("/");
    } catch (error) {
      console.error("Logout gagal:", error);
    }
  };

  return (
    <nav className="fixed bottom-0 w-full bg-[#050B20] text-gray-300 py-3 rounded-t-2xl flex justify-around items-center z-50">
      <Link
        href="/data-absensi"
        className="flex flex-col items-center hover:text-white transition"
      >
        <svg
          className="w-6 h-6 mb-1"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 11l3 3L22 4"
          />
        </svg>
        <span className="text-[10px]">Data Absensi</span>
      </Link>

      <Link
        href="/data-visit"
        className="flex flex-col items-center hover:text-white transition"
      >
        <svg
          className="w-6 h-6 mb-1"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 11l3 3L22 4"
          />
        </svg>
        <span className="text-[10px]">Data Visit</span>
      </Link>

      {isAdmin && (
        <Link
          href="/admin"
          className="flex flex-col items-center text-yellow-400 hover:text-yellow-300 transition"
        >
          <svg
            className="w-6 h-6 mb-1"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <span className="text-[10px] font-bold">Admin Panel</span>
        </Link>
      )}

      <button
        onClick={handleLogout}
        className="flex flex-col items-center hover:text-red-400 transition"
      >
        <svg
          className="w-6 h-6 mb-1"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
          />
        </svg>
        <span className="text-[10px]">Logout</span>
      </button>
    </nav>
  );
}

