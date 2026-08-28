import { Metadata } from "next";
import DataVisitView from "@/components/visit/DataVisitView";

export const metadata: Metadata = {
  title: "Data Visit",
};

export default function DataVisitPage() {
  return <DataVisitView />;
}

