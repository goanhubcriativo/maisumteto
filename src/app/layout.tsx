import type { Metadata } from "next";
import { Pacifico } from "next/font/google";
import "./globals.css";

// Fonte de "letras corridas" (script) — usada em destaques como o
// "Social" de "Jogue com responsabilidade Social".
const script = Pacifico({
  weight: "400",
  subsets: ["latin"],
  variable: "--fonte-script",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Um Teto, um recomeço — Bolão da Casa Amiga",
  description:
    "Campanha de arrecadação para a Casa Amiga (Teto). Faça sua fézinha na final da Copa: cada aposta de R$ 10 ajuda a fixar um piloti da casa emergencial. PIX seguro, 100% pra causa.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={script.variable}>
      <body>{children}</body>
    </html>
  );
}
