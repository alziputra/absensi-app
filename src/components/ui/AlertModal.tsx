"use client";

import React from "react";

export type AlertType = "success" | "warning" | "error" | "info";

export interface AlertModalProps {
  isOpen: boolean;
  type?: AlertType;
  title: string;
  message: string;
  confirmText?: string;
  onClose: () => void;
}

export default function AlertModal({
  isOpen,
  type = "info",
  title,
  message,
  confirmText = "Mengerti",
  onClose,
}: AlertModalProps) {
  if (!isOpen) return null;

  const renderIcon = () => {
    switch (type) {
      case "warning":
        return (
          <div className="w-16 h-16 rounded-full bg-amber-50 border-2 border-amber-200 text-amber-500 flex items-center justify-center mx-auto mb-4 shadow-sm animate-bounce">
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        );
      case "success":
        return (
          <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-200 text-emerald-500 flex items-center justify-center mx-auto mb-4 shadow-sm">
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        );
      case "error":
        return (
          <div className="w-16 h-16 rounded-full bg-rose-50 border-2 border-rose-200 text-rose-500 flex items-center justify-center mx-auto mb-4 shadow-sm">
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
        );
      case "info":
      default:
        return (
          <div className="w-16 h-16 rounded-full bg-blue-50 border-2 border-blue-200 text-blue-500 flex items-center justify-center mx-auto mb-4 shadow-sm">
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        );
    }
  };

  const getButtonStyles = () => {
    switch (type) {
      case "warning":
        return "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-amber-200";
      case "success":
        return "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-emerald-200";
      case "error":
        return "bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white shadow-rose-200";
      case "info":
      default:
        return "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-200";
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm transition-all duration-300">
      <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-7 max-w-[340px] w-full text-center transform transition-all animate-fade-in-up border border-gray-100">
        {renderIcon()}

        <h3 className="text-xl font-bold text-gray-800 mb-2">{title}</h3>
        <p className="text-gray-600 text-sm leading-relaxed mb-6">{message}</p>

        <button
          onClick={onClose}
          className={`w-full py-3 px-4 rounded-xl font-semibold transition-all duration-200 cursor-pointer shadow-lg active:scale-95 ${getButtonStyles()}`}
        >
          {confirmText}
        </button>
      </div>
    </div>
  );
}

