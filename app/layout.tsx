import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Photofy",
  description: "Envie suas fotos e reels do evento",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
