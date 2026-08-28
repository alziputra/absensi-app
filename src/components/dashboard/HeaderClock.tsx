"use client";

import { useCurrentTime } from "@/hooks/useCurrentTime";

interface HeaderClockProps {
  userName: string;
}

export default function HeaderClock({ userName }: HeaderClockProps) {
  const { time, date } = useCurrentTime();

  return (
    <div className="text-center z-10 mb-8 mt-4">
      <h2 className="text-xl font-semibold text-gray-800">{userName}</h2>
      <h1 className="text-5xl font-bold text-gray-800 my-2">{time || "--:--:--"}</h1>
      <p className="text-gray-500 text-sm mb-4">{date || "Memuat tanggal..."}</p>
    </div>
  );
}

