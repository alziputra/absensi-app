import { Metadata } from "next";
import DashboardView from "@/components/dashboard/DashboardView";

export const metadata: Metadata = {
  title: "Dashboard Absensi & Visit",
};

export default function DashboardPage() {
  return <DashboardView />;
}

