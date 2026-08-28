"use client";

import { FormEvent } from "react";
import { TipeAbsen } from "@/types";

interface VisitModalProps {
  isOpen: boolean;
  visitType: TipeAbsen | string;
  namaCabang: string;
  onChangeCabang: (val: string) => void;
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
}

export default function VisitModal({
  isOpen,
  visitType,
  namaCabang,
  onChangeCabang,
  onClose,
  onSubmit,
}: VisitModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <div
        className="fixed inset-0 bg-black bg-opacity-60"
        onClick={onClose}
      />
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm z-[70] animate-fade-in-up">
        <h3 className="text-xl font-bold text-gray-800 mb-2">Form {visitType}</h3>
        <p className="text-gray-500 text-sm mb-4">
          Silahkan isi nama Cabang / Outlet yang sedang Anda kunjungi.
        </p>
        <form onSubmit={onSubmit}>
          <input
            type="text"
            placeholder="Contoh: Toko Makmur Jaya"
            value={namaCabang}
            onChange={(e) => onChangeCabang(e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-3 text-black mb-4 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            required
            autoFocus
          />
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              {visitType === "Visit Masuk" ? "Buka Kamera" : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

