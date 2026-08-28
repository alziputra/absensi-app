"use client";

import { TipeAbsen } from "@/types";

interface ActionButtonsProps {
  onActionClick: (type: TipeAbsen) => void;
  isLoading: boolean;
}

export default function ActionButtons({
  onActionClick,
  isLoading,
}: ActionButtonsProps) {
  return (
    <div className="flex flex-col gap-6 z-10 pb-8">
      {/* ABSEN MASUK */}
      <button
        onClick={() => onActionClick("Absen Masuk")}
        disabled={isLoading}
        className={`w-48 h-48 rounded-full bg-gradient-to-b from-yellow-300 via-orange-300 to-orange-400 flex flex-col items-center justify-center text-white shadow-xl transition-transform ${
          isLoading ? "opacity-50 cursor-not-allowed" : "hover:scale-105 active:scale-95"
        }`}
      >
        <svg
          className="w-12 h-12 mb-2"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
          />
        </svg>
        <span className="font-bold tracking-wide text-center leading-tight">
          ABSEN
          <br />
          MASUK
        </span>
      </button>

      {/* ABSEN PULANG */}
      <button
        onClick={() => onActionClick("Absen Pulang")}
        disabled={isLoading}
        className={`w-48 h-48 rounded-full bg-gradient-to-b from-pink-400 to-purple-500 flex flex-col items-center justify-center text-white shadow-xl transition-transform ${
          isLoading ? "opacity-50 cursor-not-allowed" : "hover:scale-105 active:scale-95"
        }`}
      >
        <svg
          className="w-12 h-12 mb-2"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
          />
        </svg>
        <span className="font-bold tracking-wide text-center leading-tight">
          ABSEN
          <br />
          PULANG
        </span>
      </button>

      {/* VISIT MASUK */}
      <button
        onClick={() => onActionClick("Visit Masuk")}
        disabled={isLoading}
        className={`w-48 h-48 rounded-full bg-gradient-to-b from-blue-400 to-indigo-500 flex flex-col items-center justify-center text-white shadow-xl transition-transform ${
          isLoading ? "opacity-50 cursor-not-allowed" : "hover:scale-105 active:scale-95"
        }`}
      >
        <svg
          className="w-14 h-14 mb-2"
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
            d="M12 16v-4m0 0l-2 2m2-2l2 2"
          />
        </svg>
        <span className="font-bold tracking-wide text-center leading-tight">
          VISIT
          <br />
          MASUK
        </span>
      </button>

      {/* VISIT KELUAR */}
      <button
        onClick={() => onActionClick("Visit Keluar")}
        disabled={isLoading}
        className={`w-48 h-48 rounded-full bg-gradient-to-b from-[#6ee7b7] to-[#22d3ee] flex flex-col items-center justify-center text-white shadow-xl transition-transform ${
          isLoading ? "opacity-50 cursor-not-allowed" : "hover:scale-105 active:scale-95"
        }`}
      >
        <svg
          className="w-14 h-14 mb-2"
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
            d="M12 12v4m0 0l-2-2m2 2l2-2"
          />
        </svg>
        <span className="font-bold tracking-wide text-center leading-tight">
          VISIT
          <br />
          KELUAR
        </span>
      </button>
    </div>
  );
}

