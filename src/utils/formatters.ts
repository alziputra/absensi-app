/**
 * Format Date ke format tanggal Indonesia (contoh: 28-08-2026 atau 28 Agu 2026)
 */
export const formatDateID = (
  date: Date,
  options?: { shortMonth?: boolean }
): string => {
  if (options?.shortMonth) {
    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }
  return date
    .toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
    .replace(/\//g, "-");
};

/**
 * Format Jam ke format lokal Indonesia (contoh: 08.30.15)
 */
export const formatTimeID = (
  date: Date,
  options?: { withSeconds?: boolean }
): string => {
  return date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: options?.withSeconds === false ? undefined : "2-digit",
  });
};

/**
 * Menghitung status keterlambatan absensi masuk
 */
export const calculateLateStatus = (
  date: Date = new Date(),
  cutOffHour: number = 8,
  cutOffMinute: number = 0
): { status: "Tepat Waktu" | "Terlambat"; detail: string } => {
  const cutOffTime = new Date(date);
  cutOffTime.setHours(cutOffHour, cutOffMinute, 0, 0);

  if (date > cutOffTime) {
    const diffMs = date.getTime() - cutOffTime.getTime();
    const hours = Math.floor(diffMs / 3600000);
    const minutes = Math.floor((diffMs % 3600000) / 60000);
    return {
      status: "Terlambat",
      detail: `${hours} Jam ${minutes} Menit`,
    };
  }

  return {
    status: "Tepat Waktu",
    detail: "-",
  };
};

