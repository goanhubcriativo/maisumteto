import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Progresso público da campanha: soma das casinhas PAGAS sobre a meta.
// Meta padrão: R$ 2.000,00 (a primeira, de R$ 1.000, bateu no primeiro dia).
// Cada 5% é um "nível" do piloti.
export async function GET() {
  const meta = parseInt(process.env.META_CENTAVOS || "200000", 10) || 200000;

  let arrecadado = 0;
  try {
    const r = await prisma.casinha.aggregate({
      where: { status: "PAGO" },
      _sum: { valorTotalCentavos: true },
    });
    arrecadado = r._sum.valorTotalCentavos || 0;
  } catch {
    // Banco indisponível: devolve 0% em vez de quebrar a home.
  }

  const pct = Math.min(100, Math.floor((arrecadado / meta) * 100));
  const passo = Math.min(100, Math.floor(pct / 5) * 5); // 0,5,10,...,100 → SVG do piloti

  return NextResponse.json({
    arrecadadoCentavos: arrecadado,
    metaCentavos: meta,
    pct,
    passo,
  });
}
