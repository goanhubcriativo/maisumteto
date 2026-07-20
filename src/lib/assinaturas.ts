// O ciclo de vida de uma doação recorrente.
//
// Por que é assim, e não débito automático: não existe API pública de Pix
// Automático no Mercado Pago (testado, ver docs/RECORRENTE.md). A API de
// assinaturas deles só oferece cartão no checkout, e exigir cartão ou conta no
// Mercado Pago de quem doa custaria mais doação do que o esquecimento custa.
//
// Então o modelo é: a pessoa se compromete, e a cada período o sistema PREPARA
// a cobrança (gera o PIX) e a equipe manda o lembrete pronto. O que se automatiza
// é o trabalho de lembrar e de gerar; o toque final continua humano.

import { prisma } from "./db";
import { criarPagamentoPix, expiracaoISO } from "./mercadopago";

/** Quantos dias tem um período. */
export function diasDoPeriodo(periodicidade: "SEMANAL" | "MENSAL"): number {
  return periodicidade === "SEMANAL" ? 7 : 30;
}

/** A próxima data de cobrança, a partir de uma data base. */
export function proximaData(
  base: Date,
  periodicidade: "SEMANAL" | "MENSAL"
): Date {
  const d = new Date(base);
  if (periodicidade === "SEMANAL") {
    d.setDate(d.getDate() + 7);
  } else {
    // Soma um mês de calendário, e não 30 dias: quem se compromete "todo dia 5"
    // espera o dia 5, não uma data que escorrega um pouco a cada mês.
    const dia = d.getDate();
    d.setMonth(d.getMonth() + 1);
    // 31 de janeiro + 1 mês vira 3 de março no JavaScript. Corrige para o
    // último dia do mês de destino.
    if (d.getDate() !== dia) d.setDate(0);
  }
  return d;
}

/**
 * Chamado quando uma cobrança de assinatura é paga.
 *
 * Avança o compromisso: conta a parcela, marca a próxima e encerra quando
 * chegar ao fim. Idempotente pelo lado de quem chama (o webhook só chega aqui
 * uma vez por pedido, porque registrarPedidoPago já barra repetição).
 */
export async function avancarAssinatura(assinaturaId: string) {
  const a = await prisma.assinatura.findUnique({ where: { id: assinaturaId } });
  if (!a || a.status !== "ATIVA") return;

  const pagas = a.parcelasPagas + 1;
  const acabou = pagas >= a.parcelasPrevistas;

  await prisma.assinatura.update({
    where: { id: a.id },
    data: {
      parcelasPagas: pagas,
      ...(acabou
        ? { status: "ENCERRADA", proximaCobranca: null, encerradaEm: new Date() }
        : { proximaCobranca: proximaData(new Date(), a.periodicidade) }),
    },
  });
}

/**
 * Prepara as cobranças que vencem hoje (ou já venceram).
 *
 * Gera o PIX de cada uma e deixa pronta para a equipe mandar. Não envia nada
 * sozinho: quem manda é a pessoa, do WhatsApp dela.
 *
 * Reaproveita cobrança já preparada: se rodar duas vezes no mesmo dia, não cria
 * dois PIX para a mesma pessoa.
 */
export async function prepararCobrancasDoDia() {
  const agora = new Date();

  const vencendo = await prisma.assinatura.findMany({
    where: {
      status: "ATIVA",
      proximaCobranca: { lte: agora },
    },
    include: { acao: { select: { id: true, titulo: true, custoUnitarioCentavos: true } } },
  });

  const preparadas: { assinaturaId: string; pedidoId: string; nova: boolean }[] = [];

  for (const a of vencendo) {
    // Já existe cobrança pendente para esta assinatura? Então é ela.
    const jaTem = await prisma.pedido.findFirst({
      where: { assinaturaId: a.id, status: "PENDENTE" },
      orderBy: { createdAt: "desc" },
    });
    if (jaTem) {
      preparadas.push({ assinaturaId: a.id, pedidoId: jaTem.id, nova: false });
      continue;
    }

    const pedido = await prisma.pedido.create({
      data: {
        campanhaId: a.campanhaId,
        assinaturaId: a.id,
        nome: a.nome,
        whatsapp: a.whatsapp,
        email: a.email,
        anonimo: a.anonimo,
        valorBrutoCentavos: a.valorCentavos,
        status: "PENDENTE",
        itens: {
          create: {
            acaoId: a.acaoId,
            quantidade: 1,
            valorUnitarioCentavos: a.valorCentavos,
            custoUnitarioCentavos: a.acao.custoUnitarioCentavos,
          },
        },
      },
    });

    try {
      const pix = await criarPagamentoPix({
        nome: a.nome,
        // O CPF não é guardado na assinatura (dado sensível que só faz falta na
        // hora de cobrar), então reaproveita o do último pedido pago dela.
        cpf: await cpfDaAssinatura(a.id),
        email: a.email ?? undefined,
        valorCentavos: a.valorCentavos,
        descricao: `${a.acao.titulo} · Casa Amiga`,
        externalReference: pedido.id,
        // Sete dias para pagar: é lembrete, não boleto de vencimento apertado.
        expiraEmISO: expiracaoISO(24 * 7),
        notificationUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://www.maisumteto.com.br"}/api/webhook/mercadopago`,
      });

      await prisma.pedido.update({
        where: { id: pedido.id },
        data: {
          gatewayPagamentoId: pix.paymentId,
          pixPayload: pix.pixPayload,
          pixQrCodeImage: pix.pixQrCodeImage,
          pixExpiraEm: pix.expiraEm ? new Date(pix.expiraEm) : null,
        },
      });

      preparadas.push({ assinaturaId: a.id, pedidoId: pedido.id, nova: true });
    } catch {
      // PIX não nasceu: cancela para não deixar pendência fantasma, e tenta de
      // novo na próxima rodada.
      await prisma.pedido.update({
        where: { id: pedido.id },
        data: { status: "CANCELADO" },
      });
    }
  }

  return preparadas;
}

/** O CPF que a pessoa usou da última vez. Necessário para gerar o PIX. */
async function cpfDaAssinatura(assinaturaId: string): Promise<string> {
  const a = await prisma.assinatura.findUnique({
    where: { id: assinaturaId },
    select: { whatsapp: true, nome: true },
  });

  const anterior = await prisma.pedido.findFirst({
    where: {
      status: "PAGO",
      cpf: { not: null },
      OR: [
        { assinaturaId },
        // Se a assinatura ainda não tem pedido pago, procura pelo WhatsApp: é a
        // adesão, que foi paga como pedido comum.
        { whatsapp: a?.whatsapp ?? "__nenhum__" },
      ],
    },
    orderBy: { paidAt: "desc" },
    select: { cpf: true },
  });

  if (!anterior?.cpf) {
    throw new Error(`Sem CPF para cobrar a assinatura de ${a?.nome ?? assinaturaId}.`);
  }
  return anterior.cpf;
}

/** Encerra assinaturas cuja campanha já passou do prazo. */
export async function encerrarVencidas() {
  const campanhas = await prisma.campanha.findMany({
    where: { prazo: { not: null, lt: new Date() } },
    select: { id: true },
  });
  if (campanhas.length === 0) return 0;

  const r = await prisma.assinatura.updateMany({
    where: { campanhaId: { in: campanhas.map((c) => c.id) }, status: "ATIVA" },
    data: { status: "ENCERRADA", proximaCobranca: null, encerradaEm: new Date() },
  });
  return r.count;
}
