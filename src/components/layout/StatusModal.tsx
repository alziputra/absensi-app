"use client";

interface StatusModalProps {
  message: string;
}

export default function StatusModal({ message }: StatusModalProps) {
  if (!message) return null;

  const isSuccess = message.toLowerCase().includes("sukses") || message.toLowerCase().includes("berhasil");

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black bg-opacity-40 backdrop-blur-sm transition-opacity">
      <div className="bg-white rounded-2xl shadow-2xl p-6 flex flex-col items-center max-w-[260px] text-center transform animate-fade-in-up">
        {isSuccess ? (
          <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        ) : (
          <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-4" />
        )}
        <h3 className="text-lg font-bold text-gray-800">
          {isSuccess ? "Berhasil!" : "Mohon Tunggu"}
        </h3>
        <p className="text-gray-500 text-sm mt-1">{message}</p>
      </div>
    </div>
  );
}

