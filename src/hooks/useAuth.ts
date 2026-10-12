"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  getStoredSession,
  syncUserProfile,
} from "@/services/authService";
import { UserProfile } from "@/types";

export interface UseAuthReturn {
  user: UserProfile | null;
  profile: UserProfile | null;
  isAdmin: boolean;
  isLoading: boolean;
  userName: string;
}

export const useAuth = (options?: { requireAuth?: boolean; redirectTo?: string }): UseAuthReturn => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();
  const isInitialCheck = useRef(true);

  const requireAuth = options?.requireAuth ?? true;
  const redirectTo = options?.redirectTo ?? "/";

  useEffect(() => {
    let isMounted = true;

    const checkSession = async (shouldRedirect = false) => {
      const stored = getStoredSession();

      if (!stored) {
        if (isMounted) {
          setUser(null);
          setProfile(null);
          setIsAdmin(false);
          setIsLoading(false);
          // Hanya redirect saat initial check, bukan saat event auth_changed
          // (komponen yang logout sudah handle redirect sendiri)
          if (shouldRedirect && requireAuth) {
            router.push(redirectTo);
          }
        }
        return;
      }

      try {
        // Sinkronisasi profil terbaru dari Firestore
        const synced = await syncUserProfile(stored);
        if (isMounted) {
          const currentStored = getStoredSession();
          if (!currentStored) {
            setUser(null);
            setProfile(null);
            setIsAdmin(false);
          } else {
            setUser(synced);
            setProfile(synced);
            const role = (synced?.role || "").toLowerCase().trim();
            setIsAdmin(role === "admin" || role === "super admin");
          }
        }
      } catch (err) {
        console.error("Gagal sinkronisasi sesi:", err);
        // Gunakan data dari localStorage jika gagal fetch Firestore
        if (isMounted) {
          const currentStored = getStoredSession();
          if (!currentStored) {
            setUser(null);
            setProfile(null);
            setIsAdmin(false);
          } else {
            setUser(stored);
            setProfile(stored);
            const role = (stored.role || "").toLowerCase().trim();
            setIsAdmin(role === "admin" || role === "super admin");
          }
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    // Initial check — boleh redirect
    checkSession(true);
    isInitialCheck.current = false;

    // Event dari logout/login: update state saja, JANGAN redirect
    const handleAuthChange = () => {
      checkSession(false);
    };
    window.addEventListener("pegadaian_auth_changed", handleAuthChange);

    return () => {
      isMounted = false;
      window.removeEventListener("pegadaian_auth_changed", handleAuthChange);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const userName =
    profile?.displayName ||
    user?.displayName ||
    "Karyawan";

  return {
    user,
    profile,
    isAdmin,
    isLoading,
    userName,
  };
};
