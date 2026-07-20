import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { consultarPagamento, statusEhPago } from "@/lib/mercadopago";
import { registrarPedidoPago } from "@/lib/lancamentos";
import { avancarAssinatura } from "@/lib/assinaturas";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";

// Webhook do Mercado Pago. Configure no painel (Suas integrações → Webhooks)
// apontando para https://SEU-DOMINIO/api/webhook/mercadopago, evento "Pagamentos".
//
// O MP manda { type: "payment", data: { id } } (ou ?type=payment&data.id=...).
// Não confiamos no corpo: buscamos o pagamento de volta na API do MP (com o
// nosso token) — assim um webhook forjado não consegue marcar nada como pago.
//
// ATENDE OS DOIS: é uma conta MP só, então toda notificação cai aqui, seja de um
// Pedido da plataforma ou de uma Casinha do bolão (que já acabou, mas pode
// receber estorno). O external_reference diz de quem é; se não for de nenhum dos
// dois, responde 200 e ignora, senão o MP fica reenviando para sempre.
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

  // ---- Plataforma: é um Pedido? ----
  const pedido = await prisma.pedido.findFirst({
    where: {
      OR: [
        { id: info.externalReference || "__nenhum__" },
        { gatewayPagamentoId: paymentId },
      ],
    },
  });

  if (pedido) {
    if (statusEhPago(info.status)) {
      if (pedido.status !== "PAGO") {
        await prisma.pedido.update({
          where: { id: pedido.id },
          data: {
            status: "PAGO",
            paidAt: new Date(),
            liquidoCentavos: info.netValueCentavos,
            taxaCentavos:
              info.netValueCentavos != null
                ? pedido.valorBrutoCentavos - info.netValueCentavos
                : null,
          },
        });
      }

      // Vira dinheiro no livro-caixa. É idempotente por dentro: o MP reenvia o
      // mesmo aviso quando não recebe 200 a tempo, e sem essa guarda a vaquinha
      // subiria duas vezes com um pagamento só.
      const registro = await registrarPedidoPago(pedido.id, {
        liquidoCentavos: info.netValueCentavos,
      });

      // Doacao recorrente: conta a parcela e marca a proxima.
      //
      // So avanca quando o registro foi NOVO. registrarPedidoPago devolve "ja
      // lancado" quando o MP reenvia o mesmo aviso, e sem essa guarda a
      // assinatura pularia parcelas a cada reenvio.
      if (pedido.assinaturaId && registro.motivo === "ok") {
        await avancarAssinatura(pedido.assinaturaId);
      }

      // A página é dinâmica, mas revalidar aqui faz o total aparecer na hora.
      revalidatePath("/");
    } else if (
      ["cancelled", "refunded", "charged_back"].includes(info.status) &&
      pedido.status !== "PAGO"
    ) {
      await prisma.pedido.update({
        where: { id: pedido.id },
        data: { status: info.status === "cancelled" ? "CANCELADO" : "ESTORNADO" },
      });
    }

    return NextResponse.json({ ok: true });
  }

  // ---- Bolão (legado): é uma Casinha? ----
  // Localiza pelo external_reference (id) ou pelo id do pagamento guardado
  // (a coluna asaasPaymentId foi reaproveitada pro id do MP).
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
