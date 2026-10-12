"use client";

import Link from "next/link";
import { logoutUser } from "@/services/authService";

interface SidebarMenuProps {
  isOpen: boolean;
  onClose: () => void;
  currentPath?: string;
  isAdmin?: boolean;
}

export default function SidebarMenu({
  isOpen,
  onClose,
  currentPath = "",
  isAdmin = false,
}: SidebarMenuProps) {

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (error) {
      console.error("Gagal logout:", error);
    } finally {
      window.location.replace("/");
    }
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={onClose}
        />
      )}
      <div
        className={`fixed top-0 right-0 h-full w-64 bg-[#1a1c23] text-white z-50 flex flex-col transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="p-5 border-b border-gray-700 flex justify-between items-center">
          <span className="font-bold text-lg">Menu</span>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl leading-none"
          >
            ×
          </button>
        </div>
        <nav className="flex-1 p-5 flex flex-col gap-6 mt-2">
          <Link
            href="/dashboard"
            onClick={onClose}
            className={`transition-colors ${
              currentPath === "/dashboard"
                ? "text-white font-semibold"
                : "text-gray-300 hover:text-white"
            }`}
          >
            Home
          </Link>
          <Link
            href="/data-absensi"
            onClick={onClose}
            className={`transition-colors ${
              currentPath === "/data-absensi"
                ? "text-white font-semibold"
                : "text-gray-300 hover:text-white"
            }`}
          >
            Data Absensi
          </Link>
          <Link
            href="/data-visit"
            onClick={onClose}
            className={`transition-colors ${
              currentPath === "/data-visit"
                ? "text-white font-semibold"
                : "text-gray-300 hover:text-white"
            }`}
          >
            Data Visit
          </Link>
          <Link
            href="/klaim-absensi"
            onClick={onClose}
            className={`transition-colors flex items-center justify-between ${
              currentPath === "/klaim-absensi"
                ? "text-white font-semibold"
                : "text-gray-300 hover:text-white"
            }`}
          >
            <span>Klaim Lupa Absen</span>
            <span className="text-[10px] bg-blue-600/30 border border-blue-500/40 text-blue-400 px-2 py-0.5 rounded-full font-medium">
              Baru
            </span>
          </Link>
          {isAdmin && (
            <Link
              href="/admin"
              onClick={onClose}
              className={`transition-colors flex items-center justify-between text-amber-400 hover:text-amber-300 ${
                currentPath === "/admin"
                  ? "font-semibold"
                  : ""
              }`}
            >
              <span>Admin Panel</span>
              <span className="text-[10px] bg-amber-500/20 border border-amber-500/40 text-amber-300 px-2 py-0.5 rounded-full font-medium">
                Admin
              </span>
            </Link>
          )}
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
    </>
  );
}

