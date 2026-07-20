import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/bolao/db";
import { statusEhPago } from "@/lib/bolao/asaas";

export const runtime = "nodejs";

// Webhook do Asaas: recebe eventos de pagamento e atualiza a casinha.
// Configure no painel do Asaas (aba Webhooks) apontando para:
//   https://SEU-DOMINIO/api/webhook/asaas
// e cadastre o mesmo token de ASAAS_WEBHOOK_TOKEN no campo "Token de autenticação".
export async function POST(req: NextRequest) {
  const tokenEsperado = process.env.ASAAS_WEBHOOK_TOKEN;
  const tokenRecebido = req.headers.get("asaas-access-token");

  if (!tokenEsperado || tokenRecebido !== tokenEsperado) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const payment = body?.payment;
  if (!payment) return NextResponse.json({ ok: true });

  // Localiza a casinha pelo externalReference (id) ou pelo id do pagamento.
  const casinha = await prisma.casinha.findFirst({
    where: {
      OR: [
        { id: payment.externalReference || "__none__" },
        { asaasPaymentId: payment.id || "__none__" },
      ],
    },
  });

  if (!casinha) return NextResponse.json({ ok: true });

  if (statusEhPago(payment.status) && casinha.status !== "PAGO") {
    await prisma.casinha.update({
      where: { id: casinha.id },
      data: {
        status: "PAGO",
        paidAt: new Date(),
        liquidoCentavos:
          typeof payment.netValue === "number"
            ? Math.round(payment.netValue * 100)
            : null,
      },
    });
  } else if (
    ["PAYMENT_DELETED", "PAYMENT_REFUNDED"].includes(body.event) &&
    casinha.status !== "PAGO"
  ) {
    await prisma.casinha.update({
      where: { id: casinha.id },
      data: { status: "CANCELADO" },
    });
  }

  return NextResponse.json({ ok: true });
}
