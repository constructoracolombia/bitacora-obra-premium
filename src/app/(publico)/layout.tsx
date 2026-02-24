import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: "Adicional de Obra",
  description: "Información del adicional",
};

export default function PublicoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
