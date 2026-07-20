// Diz se um pedido já foi pago. A tela de pagamento pergunta de tempos em tempos.
//
// Existe porque o webhook pode demorar (ou falhar), e quem acabou de pagar quer
// ver a confirmação na hora. Se o banco ainda diz PENDENTE, esta rota pergunta
// ao Mercado Pago e, se já estiver pago, confirma na hora.
//
// Ou seja: o webhook é o caminho principal e esta rota é a rede de segurança.
// Os dois chamam a mesma função de registro, que é idempotente, então confirmar
// duas vezes não conta o dinheiro duas vezes.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { consultarPagamento, statusEhPago } from "@/lib/mercadopago";
import { registrarPedidoPago } from "@/lib/lancamentos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const pedido = await prisma.pedido.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      valorBrutoCentavos: true,
      pixPayload: true,
      pixQrCodeImage: true,
      pixExpiraEm: true,
      gatewayPagamentoId: true,
      nome: true,
      itens: { select: { quantidade: true, acao: { select: { titulo: true, slug: true } } } },
    },
  });

  if (!pedido) {
    return NextResponse.json({ erro: "Pedido não encontrado." }, { status: 404 });
  }

  // Ainda pendente: vale perguntar ao MP se o dinheiro já entrou.
  if (pedido.status === "PENDENTE" && pedido.gatewayPagamentoId) {
    try {
      const info = await consultarPagamento(pedido.gatewayPagamentoId);
      if (statusEhPago(info.status)) {
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
        await registrarPedidoPago(pedido.id, { liquidoCentavos: info.netValueCentavos });
        return NextResponse.json({ ...pedido, status: "PAGO" });
      }
    } catch {
      // MP fora do ar não pode derrubar a tela: devolve o que o banco sabe.
    }
  }

  return NextResponse.json(pedido);
}
