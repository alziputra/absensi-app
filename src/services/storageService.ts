import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import imageCompression from "browser-image-compression";
import { storage } from "@/config/firebase";

/**
 * Mengompresi gambar dan mengunggahnya ke Firebase Storage
 * Struktur folder rapi per-user: `absensi/{userId}/{timestamp}_{namaFile}`
 */
export const compressAndUploadPhoto = async (
  file: File,
  userId: string,
  folder: string = "absensi"
): Promise<string> => {
  const options = {
    maxSizeMB: 0.5,
    maxWidthOrHeight: 800,
    useWebWorker: true,
  };

  const compressedFile = await imageCompression(file, options);
  const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const fileName = `${Date.now()}_${cleanFileName}`;

  // Path Storage: absensi/{userId}/{fileName}
  const storageRef = ref(storage, `${folder}/${userId}/${fileName}`);

  await uploadBytes(storageRef, compressedFile);
  return await getDownloadURL(storageRef);
};
