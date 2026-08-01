import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import RegistrarSW from "@/components/RegistrarSW";

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
  // Instalável: o nome do atalho na tela inicial e o ícone da barra do iOS.
  appleWebApp: { capable: true, title: "Casa Amiga", statusBarStyle: "default" },
  icons: { apple: "/icone-app.svg" },
};

export const viewport: Viewport = {
  themeColor: "#0092dd",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body>
        {children}
        <RegistrarSW />
      </body>
    </html>
  );
}
