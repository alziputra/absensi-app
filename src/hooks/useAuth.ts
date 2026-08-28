"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "@/config/firebase";
import { syncUserProfile } from "@/services/authService";
import { UserProfile } from "@/types";

export interface UseAuthReturn {
  user: User | null;
  profile: UserProfile | null;
  isAdmin: boolean;
  isLoading: boolean;
  userName: string;
}

export const useAuth = (options?: { requireAuth?: boolean; redirectTo?: string }): UseAuthReturn => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();

  const requireAuth = options?.requireAuth ?? true;
  const redirectTo = options?.redirectTo ?? "/";

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setUser(null);
        setProfile(null);
        setIsAdmin(false);
        setIsLoading(false);
        if (requireAuth) {
          router.push(redirectTo);
        }
      } else {
        setUser(currentUser);

        try {
          // Ambil dan sinkronisasi data profil dari Firestore (absensi-app/{uid})
          const syncedProfile = await syncUserProfile(currentUser);
          setProfile(syncedProfile);

          // HAK AKSES ADMIN 100% BERDASARKAN FIELD `role` DI FIRESTORE
          const userRole = (syncedProfile.role || "").toLowerCase().trim();
          const isRoleAdmin = userRole === "admin" || userRole === "super admin";

          setIsAdmin(isRoleAdmin);
        } catch (error) {
          console.error("Gagal sync user profile:", error);
          setIsAdmin(false);
        } finally {
          setIsLoading(false);
        }
      }
    });

    return () => unsubscribe();
  }, [router, requireAuth, redirectTo]);

  const userName =
    profile?.displayName ||
    user?.displayName ||
    (user?.email
      ? user.email.split("@")[0].charAt(0).toUpperCase() +
        user.email.split("@")[0].slice(1)
      : "Karyawan");

  return {
    user,
    profile,
    isAdmin,
    isLoading,
    userName,
  };
};
