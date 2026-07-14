import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { taxaPixEstimadaCentavos } from "@/lib/config";

export const runtime = "nodejs";

function autorizado(req: NextRequest): boolean {
  const senha = process.env.ADMIN_PASSWORD || "";
  const recebida = req.headers.get("x-admin-password") || "";
  return senha.length > 0 && recebida === senha;
}

export async function GET(req: NextRequest) {
  if (!autorizado(req)) {
    return NextResponse.json({ erro: "Senha incorreta." }, { status: 401 });
  }

  const taxaEstimada = taxaPixEstimadaCentavos();

  const casinhas = await prisma.casinha.findMany({
    orderBy: { createdAt: "desc" },
    include: { palpites: { orderBy: { createdAt: "asc" } } },
  });

  const pagas = casinhas.filter((c) => c.status === "PAGO");

  // Bruto = valor total das casinhas pagas
  const totalArrecadadoCentavos = pagas.reduce(
    (s, c) => s + c.valorTotalCentavos,
    0
  );
  const totalDoacoesCentavos = pagas.reduce((s, c) => s + c.doacaoCentavos, 0);
  const totalApostasCentavos = totalArrecadadoCentavos - totalDoacoesCentavos;
  const totalPalpitesPagos = pagas.reduce((s, c) => s + c.palpites.length, 0);

  // Líquido = netValue real do Asaas quando disponível; senão, estimativa
  // (bruto - taxa por PIX). `estimado` sinaliza que ainda há valores estimados.
  let algumEstimado = false;
  const totalLiquidoCentavos = pagas.reduce((s, c) => {
    if (c.liquidoCentavos !== null && c.liquidoCentavos !== undefined) {
      return s + c.liquidoCentavos;
    }
    algumEstimado = true;
    return s + Math.max(0, c.valorTotalCentavos - taxaEstimada);
  }, 0);
  const totalTaxaCentavos = totalArrecadadoCentavos - totalLiquidoCentavos;

  return NextResponse.json({
    resumo: {
      totalCasinhas: casinhas.length,
      casinhasPagas: pagas.length,
      pendentes: casinhas.filter((c) => c.status === "PENDENTE").length,
      palpitesPagos: totalPalpitesPagos,
      totalArrecadadoCentavos,
      totalApostasCentavos,
      totalDoacoesCentavos,
      totalTaxaCentavos,
      totalLiquidoCentavos,
      taxaEstimadaCentavos: taxaEstimada,
      liquidoTemEstimativa: algumEstimado,
    },
    casinhas: casinhas.map((c) => {
      const liquido =
        c.liquidoCentavos ??
        (c.status === "PAGO"
          ? Math.max(0, c.valorTotalCentavos - taxaEstimada)
          : null);
      return {
        id: c.id,
        nome: c.nome,
        whatsapp: c.whatsapp,
        cpf: c.cpf,
        email: c.email,
        status: c.status,
        qtdPalpites: c.palpites.length,
        palpites: c.palpites.map((p) => `${p.placarCasa}x${p.placarVisitante}`),
        doacaoCentavos: c.doacaoCentavos,
        valorTotalCentavos: c.valorTotalCentavos,
        liquidoCentavos: liquido,
        liquidoReal: c.liquidoCentavos !== null && c.liquidoCentavos !== undefined,
        createdAt: c.createdAt,
        paidAt: c.paidAt,
      };
    }),
  });
}
