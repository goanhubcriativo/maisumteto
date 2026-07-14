import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bolão da Final da Copa — Casa Amiga (Teto)",
  description:
    "Participe do bolão da final da Copa do Mundo e ajude a Casa Amiga de Dezembro da Teto. Cada palpite custa R$ 10, pago via PIX.",
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
