// Leitura do livro-caixa.
//
// Tudo aqui soma Lancamento, nunca Pedido. Sao coisas diferentes: Pedido e o
// que a pessoa prometeu pagar, Lancamento e o que aconteceu com o dinheiro.
// Somar pedido pago daria o bruto, e bruto nao paga casa.
//
// Como o sinal ja esta gravado no valor (ver lancamentos.ts), o liquido de
// qualquer recorte e sempre uma soma simples da coluna.

import { TipoLancamento } from "@prisma/client";
import { prisma } from "./db";
import { percentualDaMeta } from "./dinheiro";

export interface Resumo {
  brutoCentavos: number;   // tudo que entrou
  custoCentavos: number;   // o que a acao custou pra acontecer (positivo)
  taxaCentavos: number;    // o que o gateway levou (positivo)
  ajusteCentavos: number;  // correcoes manuais (com sinal)
  liquidoCentavos: number; // o que sobrou de verdade pra casa
}

const zerado = (): Resumo => ({
  brutoCentavos: 0,
  custoCentavos: 0,
  taxaCentavos: 0,
  ajusteCentavos: 0,
  liquidoCentavos: 0,
});

/** Joga uma soma por tipo dentro do resumo, ja desfazendo o sinal de saida. */
function acumular(r: Resumo, tipo: TipoLancamento, soma: number) {
  if (tipo === TipoLancamento.RECEITA) r.brutoCentavos += soma;
  else if (tipo === TipoLancamento.CUSTO) r.custoCentavos += -soma;
  else if (tipo === TipoLancamento.TAXA) r.taxaCentavos += -soma;
  else r.ajusteCentavos += soma;
  r.liquidoCentavos += soma;
}

export interface ResumoCampanha extends Resumo {
  metaCentavos: number;
  percentual: number;
  /** Quanto ja saiu da conta do lider rumo a Teto. */
  repassadoCentavos: number;
  /** Quanto foi arrecadado e ainda esta parado na conta do lider. */
  saldoARepassarCentavos: number;
  ultimoRepasseEm: Date | null;
}

/**
 * Os numeros da campanha.
 *
 * Repare que repasse nao entra no liquido: sao perguntas diferentes. O liquido
 * diz quanto a campanha arrecadou, o repasse diz onde o dinheiro esta. Descontar
 * repasse do liquido faria a barra andar pra tras quando o dinheiro chega na
 * Teto, exatamente ao contrario do que aconteceu.
 */
export async function resumoCampanha(campanhaId: string): Promise<ResumoCampanha> {
  const [campanha, grupos, repasses] = await Promise.all([
    prisma.campanha.findUniqueOrThrow({
      where: { id: campanhaId },
      select: { metaCentavos: true },
    }),
    prisma.lancamento.groupBy({
      by: ["tipo"],
      where: { campanhaId },
      _sum: { valorCentavos: true },
    }),
    prisma.repasse.aggregate({
      where: { campanhaId },
      _sum: { valorCentavos: true },
      _max: { data: true },
    }),
  ]);

  const r = zerado();
  for (const g of grupos) acumular(r, g.tipo, g._sum.valorCentavos ?? 0);

  const repassado = repasses._sum.valorCentavos ?? 0;

  return {
    ...r,
    metaCentavos: campanha.metaCentavos,
    percentual: percentualDaMeta(r.liquidoCentavos, campanha.metaCentavos),
    repassadoCentavos: repassado,
    saldoARepassarCentavos: r.liquidoCentavos - repassado,
    ultimoRepasseEm: repasses._max.data ?? null,
  };
}

export interface LinhaPorAcao extends Resumo {
  acaoId: string | null; // null = campanha geral (chorinho, custo de divulgacao)
  titulo: string;
  tipoAcao: string | null;
}

/**
 * O extrato que responde "de qual acao veio cada real".
 * Vem ordenado do que mais rendeu pro que menos rendeu, entao uma acao no
 * vermelho (custo pago, nada vendido ainda) aparece la embaixo, onde deve estar.
 */
export async function extratoPorAcao(campanhaId: string): Promise<LinhaPorAcao[]> {
  const [grupos, acoes] = await Promise.all([
    prisma.lancamento.groupBy({
      by: ["acaoId", "tipo"],
      where: { campanhaId },
      _sum: { valorCentavos: true },
    }),
    prisma.acao.findMany({
      where: { campanhaId },
      select: { id: true, titulo: true, tipo: true },
    }),
  ]);

  const porAcao = new Map<string | null, LinhaPorAcao>();

  for (const g of grupos) {
    const chave = g.acaoId;
    if (!porAcao.has(chave)) {
      const acao = chave ? acoes.find((a) => a.id === chave) : null;
      porAcao.set(chave, {
        acaoId: chave,
        titulo: acao?.titulo ?? "Campanha (doacoes e custos gerais)",
        tipoAcao: acao?.tipo ?? null,
        ...zerado(),
      });
    }
    acumular(porAcao.get(chave)!, g.tipo, g._sum.valorCentavos ?? 0);
  }

  // Acao criada e ainda sem nenhum lancamento aparece zerada, e nao some da lista.
  for (const acao of acoes) {
    if (!porAcao.has(acao.id)) {
      porAcao.set(acao.id, {
        acaoId: acao.id,
        titulo: acao.titulo,
        tipoAcao: acao.tipo,
        ...zerado(),
      });
    }
  }

  return [...porAcao.values()].sort((a, b) => b.liquidoCentavos - a.liquidoCentavos);
}

/** O extrato linha a linha, pro lider auditar e conferir com o app do banco. */
export async function linhasExtrato(
  campanhaId: string,
  opts: { acaoId?: string; limite?: number } = {}
) {
  return prisma.lancamento.findMany({
    where: {
      campanhaId,
      ...(opts.acaoId ? { acaoId: opts.acaoId } : {}),
    },
    orderBy: { data: "desc" },
    take: opts.limite ?? 200,
    include: {
      acao: { select: { titulo: true, tipo: true } },
      pedido: { select: { nome: true, gatewayPagamentoId: true } },
      criadoPor: { select: { nome: true } },
    },
  });
}
