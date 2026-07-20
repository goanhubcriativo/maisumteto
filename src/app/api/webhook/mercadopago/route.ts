import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/bolao/db";
import { consultarPagamento, statusEhPago } from "@/lib/bolao/mercadopago";

export const runtime = "nodejs";

// Webhook do Mercado Pago. Configure no painel (Suas integrações → Webhooks)
// apontando para https://SEU-DOMINIO/api/webhook/mercadopago, evento "Pagamentos".
//
// O MP manda { type: "payment", data: { id } } (ou ?type=payment&data.id=...).
// Não confiamos no corpo: buscamos o pagamento de volta na API do MP (com o
// nosso token) — assim um webhook forjado não consegue marcar nada como pago.
export async function POST(req: NextRequest) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    // MP às vezes manda os dados só na query
  }

  const url = new URL(req.url);
  const tipo = body?.type || url.searchParams.get("type");
  const paymentId = String(
    body?.data?.id || url.searchParams.get("data.id") || ""
  );

  if (tipo !== "payment" || !paymentId) {
    return NextResponse.json({ ok: true });
  }

  let info;
  try {
    info = await consultarPagamento(paymentId);
  } catch {
    // Se não conseguir consultar agora, responde 200 pro MP não ficar reenviando
    // em loop; o polling da tela de pagamento também confirma.
    return NextResponse.json({ ok: true });
  }

  // Localiza a casinha pelo external_reference (id) ou pelo id do pagamento
  // guardado (reaproveitamos a coluna asaasPaymentId pro id do MP).
  const casinha = await prisma.casinha.findFirst({
    where: {
      OR: [
        { id: info.externalReference || "__none__" },
        { asaasPaymentId: paymentId },
      ],
    },
  });
  if (!casinha) return NextResponse.json({ ok: true });

  if (statusEhPago(info.status) && casinha.status !== "PAGO") {
    await prisma.casinha.update({
      where: { id: casinha.id },
      data: {
        status: "PAGO",
        paidAt: new Date(),
        liquidoCentavos: info.netValueCentavos,
      },
    });
  } else if (
    ["cancelled", "refunded", "charged_back"].includes(info.status) &&
    casinha.status !== "PAGO"
  ) {
    await prisma.casinha.update({
      where: { id: casinha.id },
      data: { status: "CANCELADO" },
    });
  }

  return NextResponse.json({ ok: true });
}
