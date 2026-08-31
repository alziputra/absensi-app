/**
 * Mendapatkan koordinat GPS latitude dan longitude
 */
export const getCurrentCoordinates = (): Promise<string> => {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      return resolve("Tanpa GPS");
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(`${pos.coords.latitude},${pos.coords.longitude}`),
      (error) => {
        console.warn("Gagal mendapatkan lokasi GPS:", error);
        resolve("Gagal mendapat GPS");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
};

