import type { Metadata } from "next";
import { Raleway } from "next/font/google";
import "./bolao.css";
import ProtecaoConteudo from "@/components/bolao/ProtecaoConteudo";

// Layout ANINHADO, nao raiz.
//
// O bolao virou uma parte do site (/bolaodacopa), e a raiz agora e a plataforma.
// So pode existir um <html>/<body> no site inteiro, e ele mora em
// src/app/layout.tsx. Aqui sobra o que e do bolao: a fonte dele e o CSS dele.
//
// A fonte entra por uma <div> em vez de ir no <html>: assim o bolao continua em
// Raleway sem arrastar a plataforma junto, que usa Inter.

const raleway = Raleway({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--fonte-base",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Um Teto, um recomeço · Bolão da Casa Amiga",
  description:
    "Campanha de arrecadação para a Casa Amiga (Teto). Faça sua fézinha na final da Copa: cada aposta de R$ 10 ajuda a fixar um piloti da casa emergencial. PIX seguro; descontada só a pequena taxa do PIX, todo o restante vai para a causa.",
};

export default function LayoutDoBolao({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${raleway.variable} bolao-raiz`}>
      <ProtecaoConteudo />
      {children}
    </div>
  );
}
