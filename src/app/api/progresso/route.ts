import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { metaCampanhaCentavos } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Progresso público da campanha: soma das casinhas PAGAS sobre a meta.
// Meta padrão: R$ 1.500,00. Cada 5% é um "nível" do piloti.
export async function GET() {
  const meta = metaCampanhaCentavos();

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
