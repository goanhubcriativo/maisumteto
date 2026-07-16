import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

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

  // Mercado Pago cobra ~0,99% por PIX e arredonda o líquido PRA BAIXO no
  // centavo, em cada pagamento. Esta estimativa imita isso e só é usada
  // enquanto o valor líquido real (net_received_amount) ainda não chegou.
  const TAXA_MP = 0.0099;
  const estLiquido = (v: number) => Math.max(0, Math.floor(v * (1 - TAXA_MP)));

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
    return s + estLiquido(c.valorTotalCentavos);
  }, 0);
  const totalTaxaCentavos = totalArrecadadoCentavos - totalLiquidoCentavos;

  // Funil: visitantes ÚNICOS por tipo de evento (métricas anônimas).
  // TUDO na mesma janela: da 1ª medição pra cá. Pagamentos anteriores ao
  // início da medição não entram (não existe visita registrada pra eles).
  const funil: Record<string, number> = {};
  let funilDesde: Date | null = null;
  let funilPagas = 0;
  try {
    const primeiro = await prisma.evento.findFirst({
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    });
    funilDesde = primeiro?.createdAt ?? null;
    const grupos = await prisma.evento.groupBy({ by: ["tipo", "visitante"] });
    for (const g of grupos) funil[g.tipo] = (funil[g.tipo] || 0) + 1;
    if (funilDesde) {
      const desde = funilDesde;
      funilPagas = pagas.filter((c) => c.paidAt && c.paidAt >= desde).length;
    }
  } catch {
    // tabela vazia/indisponível: funil fica vazio
  }

  return NextResponse.json({
    funil,
    funilDesde,
    funilPagas,
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
      liquidoTemEstimativa: algumEstimado,
    },
    casinhas: casinhas.map((c) => {
      const liquido =
        c.liquidoCentavos ??
        (c.status === "PAGO" ? estLiquido(c.valorTotalCentavos) : null);
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
