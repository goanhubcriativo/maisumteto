import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Inter no lugar da Raleway (que e a fonte do material do bolao).
//
// O motivo e numero: os algarismos da Raleway tem larguras diferentes e desenho
// muito marcado, entao valor embaixo de valor nao alinha e a coluna fica torta.
// A Inter tem algarismo tabular (todos com a mesma largura, ligado no
// globals.css) e desenho neutro, que e o que se espera de numero de dinheiro.
const inter = Inter({
  subsets: ["latin"],
  variable: "--fonte-base",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Um TETO, um RECOMEÇO!",
  description:
    "Arrecadação coletiva para construir uma casa. Doações, bolão, rifa, camisas e eventos, com extrato aberto de onde veio cada real.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
