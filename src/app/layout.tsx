import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Faça sua fézinha, levante uma casinha — Teto",
  description:
    "Cada fézinha na final da Copa finca um piloti de uma casa emergencial da Teto. Palpite R$ 10, pagamento via PIX. 100% pra causa.",
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
