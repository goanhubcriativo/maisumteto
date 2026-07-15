import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { consultarPagamento, statusEhPago } from "@/lib/mercadopago";

export const runtime = "nodejs";

// Consulta o status da casinha. Se ainda PENDENTE, pergunta ao Asaas
// (confirma o pagamento mesmo sem webhook — útil em desenvolvimento).
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const casinha = await prisma.casinha.findUnique({
    where: { id },
    include: { palpites: { orderBy: { createdAt: "asc" } } },
  });
  if (!casinha) {
    return NextResponse.json({ erro: "Casinha não encontrada." }, { status: 404 });
  }

  let status = casinha.status;

  if (casinha.status === "PENDENTE" && casinha.asaasPaymentId) {
    try {
      const r = await consultarPagamento(casinha.asaasPaymentId);
      if (statusEhPago(r.status)) {
        await prisma.casinha.update({
          where: { id },
          data: {
            status: "PAGO",
            paidAt: new Date(),
            liquidoCentavos: r.netValueCentavos,
          },
        });
        status = "PAGO";
      }
    } catch {
      // Se o Mercado Pago falhar, devolve o status atual.
    }
  }

  return NextResponse.json({
    id: casinha.id,
    status,
    nome: casinha.nome,
    doacaoCentavos: casinha.doacaoCentavos,
    valorTotalCentavos: casinha.valorTotalCentavos,
    palpites: casinha.palpites.map((p) => ({
      placarCasa: p.placarCasa,
      placarVisitante: p.placarVisitante,
    })),
    pixPayload: status === "PAGO" ? null : casinha.pixPayload,
    pixQrCodeImage: status === "PAGO" ? null : casinha.pixQrCodeImage,
  });
}
