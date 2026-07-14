import type { Metadata } from "next";
import { Raleway } from "next/font/google";
import "./globals.css";

// Todo o material da campanha é composto em Raleway.
const raleway = Raleway({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--fonte-base",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Um Teto, um recomeço · Bolão da Casa Amiga",
  description:
    "Campanha de arrecadação para a Casa Amiga (Teto). Faça sua fézinha na final da Copa: cada aposta de R$ 10 ajuda a fixar um piloti da casa emergencial. PIX seguro, 100% pra causa.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={raleway.variable}>
      <body>{children}</body>
    </html>
  );
}
