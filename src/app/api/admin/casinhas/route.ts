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

  const casinhas = await prisma.casinha.findMany({
    orderBy: { createdAt: "desc" },
    include: { palpites: { orderBy: { createdAt: "asc" } } },
  });

  const pagas = casinhas.filter((c) => c.status === "PAGO");

  const totalArrecadadoCentavos = pagas.reduce(
    (s, c) => s + c.valorTotalCentavos,
    0
  );
  const totalDoacoesCentavos = pagas.reduce((s, c) => s + c.doacaoCentavos, 0);
  const totalPalpitesPagos = pagas.reduce((s, c) => s + c.palpites.length, 0);

  return NextResponse.json({
    resumo: {
      totalCasinhas: casinhas.length,
      casinhasPagas: pagas.length,
      pendentes: casinhas.filter((c) => c.status === "PENDENTE").length,
      palpitesPagos: totalPalpitesPagos,
      totalArrecadadoCentavos,
      totalDoacoesCentavos,
    },
    casinhas: casinhas.map((c) => ({
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
      createdAt: c.createdAt,
      paidAt: c.paidAt,
    })),
  });
}
