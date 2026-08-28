import { Metadata } from "next";
import AdminPanelView from "@/components/admin/AdminPanelView";

export const metadata: Metadata = {
  title: "Admin Panel - Rekap Seluruh Karyawan",
};

export default function AdminPage() {
  return <AdminPanelView />;
}

