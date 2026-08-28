import { Metadata } from "next";
import DataAbsensiView from "@/components/absensi/DataAbsensiView";

export const metadata: Metadata = {
  title: "Data Absensi",
};

export default function DataAbsensiPage() {
  return <DataAbsensiView />;
}

