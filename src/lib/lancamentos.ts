// Escrita do livro-caixa.
//
// Ninguem cria Lancamento na mao fora daqui. O motivo e o sinal: RECEITA entra
// positiva, CUSTO e TAXA entram negativos. Um sinal trocado nao quebra nada na
// hora, so faz o extrato mentir tres semanas depois.

import { Prisma, TipoLancamento } from "@prisma/client";
import { prisma } from "./db";

type Tx = Prisma.TransactionClient;

interface NovoLancamento {
  campanhaId: string;
  acaoId?: string | null;
  pedidoId?: string | null;
  descricao: string;
  /** Sempre em valor absoluto. O sinal quem decide e o tipo. */
  valorCentavos: number;
  data?: Date;
  criadoPorId?: string | null;
  comprovanteUrl?: string | null;
}

function comSinal(tipo: TipoLancamento, valorAbsoluto: number): number {
  const v = Math.abs(valorAbsoluto);
  return tipo === TipoLancamento.RECEITA ? v : -v;
}

async function criar(db: Tx, tipo: TipoLancamento, l: NovoLancamento) {
  return db.lancamento.create({
    data: {
      campanhaId: l.campanhaId,
      acaoId: l.acaoId ?? null,
      pedidoId: l.pedidoId ?? null,
      tipo,
      descricao: l.descricao,
      valorCentavos: comSinal(tipo, l.valorCentavos),
      data: l.data ?? new Date(),
      criadoPorId: l.criadoPorId ?? null,
      comprovanteUrl: l.comprovanteUrl ?? null,
    },
  });
}

export const lancarReceita = (db: Tx, l: NovoLancamento) =>
  criar(db, TipoLancamento.RECEITA, l);

export const lancarCusto = (db: Tx, l: NovoLancamento) =>
  criar(db, TipoLancamento.CUSTO, l);

export const lancarTaxa = (db: Tx, l: NovoLancamento) =>
  criar(db, TipoLancamento.TAXA, l);

/**
 * Registra um custo FIXO, daqueles que não dá pra ratear por venda: o aluguel
 * do salão, os R$ 200 do bingo, a arte encomendada. Diferente do custo por
 * unidade (que nasce a cada item vendido), este é um valor cheio, lançado uma
 * vez, e some do líquido na hora. Como o líquido é o que a barra mede contra a
 * meta, um custo de R$ 200 significa R$ 200 a mais pra arrecadar até fechar.
 *
 * acaoId nulo = custo geral da campanha (material de divulgação, por exemplo).
 * Abre a própria transação: é chamado direto de uma server action, não de
 * dentro de outra escrita.
 */
export async function registrarCustoFixo(dados: {
  campanhaId: string;
  acaoId?: string | null;
  descricao: string;
  valorCentavos: number;
  data?: Date;
  criadoPorId?: string | null;
}) {
  return prisma.$transaction((db) =>
    lancarCusto(db, {
      campanhaId: dados.campanhaId,
      acaoId: dados.acaoId ?? null,
      descricao: dados.descricao,
      valorCentavos: dados.valorCentavos,
      data: dados.data,
      criadoPorId: dados.criadoPorId,
    })
  );
}

/** Os custos fixos lançados na mão (não os que vieram de venda). Pro extrato. */
export async function custosFixosDaAcao(acaoId: string) {
  return prisma.lancamento.findMany({
    where: { acaoId, tipo: TipoLancamento.CUSTO, pedidoId: null },
    orderBy: { data: "desc" },
    include: { criadoPor: { select: { nome: true } } },
  });
}

/** Apaga um custo fixo lançado na mão. Só custo sem pedido: o de venda é dono do gateway. */
export async function apagarCustoFixo(id: string) {
  return prisma.lancamento.deleteMany({
    where: { id, tipo: TipoLancamento.CUSTO, pedidoId: null },
  });
}

/**
 * Ajuste manual e o unico que aceita valor negativo de proposito
 * (estorno, correcao de digitacao). Por isso nao passa por comSinal().
 */
export async function lancarAjuste(db: Tx, l: NovoLancamento) {
  return db.lancamento.create({
    data: {
      campanhaId: l.campanhaId,
      acaoId: l.acaoId ?? null,
      pedidoId: l.pedidoId ?? null,
      tipo: TipoLancamento.AJUSTE,
      descricao: l.descricao,
      valorCentavos: l.valorCentavos, // com sinal, como veio
      data: l.data ?? new Date(),
      criadoPorId: l.criadoPorId ?? null,
      comprovanteUrl: l.comprovanteUrl ?? null,
    },
  });
}

/**
 * Reparte um total entre pesos, sem perder centavo no arredondamento.
 * O ultimo pedaco absorve a sobra, entao a soma bate exatamente com o total.
 *
 * Usado pra ratear a taxa do gateway (cobrada uma vez por PIX) entre as acoes
 * do pedido, proporcional ao quanto cada uma pesou. Sem isso, um pedido com
 * camisa + rifa jogaria a taxa inteira em cima de uma das duas.
 */
export function ratear(total: number, pesos: number[]): number[] {
  if (pesos.length === 0) return [];
  const somaPesos = pesos.reduce((a, b) => a + b, 0);
  if (somaPesos <= 0) return pesos.map(() => 0);

  const partes = pesos.map((p) => Math.floor((total * p) / somaPesos));
  const distribuido = partes.reduce((a, b) => a + b, 0);
  partes[partes.length - 1] += total - distribuido;
  return partes;
}

/**
 * Traduz um pedido pago em lancamentos: receita por acao, custo por acao e a
 * taxa do gateway rateada. Chamar do webhook, quando o PIX confirma.
 *
 * Idempotente: o webhook do Asaas repete quando nao recebe 200 a tempo, e sem
 * essa guarda a vaquinha subiria duas vezes com um pagamento so.
 */
export async function registrarPedidoPago(
  pedidoId: string,
  opts: { liquidoCentavos?: number | null } = {}
) {
  return prisma.$transaction(async (db) => {
    const jaLancado = await db.lancamento.count({ where: { pedidoId } });
    if (jaLancado > 0) return { criados: 0, motivo: "ja lancado" as const };

    const pedido = await db.pedido.findUniqueOrThrow({
      where: { id: pedidoId },
      include: { itens: { include: { acao: true } } },
    });

    const { campanhaId } = pedido;

    // Receita e custo, item por item, cada um carimbado com a acao de origem.
    for (const item of pedido.itens) {
      const bruto = item.valorUnitarioCentavos * item.quantidade;
      await lancarReceita(db, {
        campanhaId,
        acaoId: item.acaoId,
        pedidoId,
        descricao: `${item.acao.titulo} (${item.quantidade}x) - ${pedido.nome}`,
        valorCentavos: bruto,
      });

      const custo = item.custoUnitarioCentavos * item.quantidade;
      if (custo > 0) {
        await lancarCusto(db, {
          campanhaId,
          acaoId: item.acaoId,
          pedidoId,
          descricao: `Custo unitario: ${item.acao.titulo} (${item.quantidade}x)`,
          valorCentavos: custo,
        });
      }
    }

    // O chorinho PERTENCE a acao que a pessoa estava comprando: ela somou um
    // extra por cima daquela rifa, daquela camisa. Amarrar na acao faz o valor
    // entrar na fatia dela, em vez de virar uma "doacao avulsa" solta que nao
    // bate com nada. (Um pedido tem uma acao so; se tivesse varias, vai pra
    // primeira, que e a que puxou o pedido.)
    const acaoDoExtra = pedido.itens[0]?.acaoId ?? null;
    if (pedido.doacaoExtraCentavos > 0) {
      await lancarReceita(db, {
        campanhaId,
        acaoId: acaoDoExtra,
        pedidoId,
        descricao: `Ajuda extra - ${pedido.nome}`,
        valorCentavos: pedido.doacaoExtraCentavos,
      });
    }

    // Taxa: so da pra saber quando o gateway informa o liquido.
    const liquido = opts.liquidoCentavos ?? pedido.liquidoCentavos;
    const taxa = liquido != null ? pedido.valorBrutoCentavos - liquido : 0;

    if (taxa > 0) {
      // O rateio olha tudo que compos o bruto, inclusive o chorinho. Se olhasse
      // so os itens, um pedido de doacao pura (sem item nenhum) perderia a taxa
      // e o extrato fecharia acima do que caiu na conta.
      const parcelas: { acaoId: string | null; rotulo: string; peso: number }[] =
        pedido.itens.map((i) => ({
          acaoId: i.acaoId,
          rotulo: i.acao.titulo,
          peso: i.valorUnitarioCentavos * i.quantidade,
        }));

      if (pedido.doacaoExtraCentavos > 0) {
        parcelas.push({
          acaoId: acaoDoExtra,
          rotulo: "Ajuda extra",
          peso: pedido.doacaoExtraCentavos,
        });
      }

      const partes = ratear(taxa, parcelas.map((p) => p.peso));
      for (const [idx, parcela] of parcelas.entries()) {
        if (partes[idx] <= 0) continue;
        await lancarTaxa(db, {
          campanhaId,
          acaoId: parcela.acaoId,
          pedidoId,
          descricao: `Taxa do gateway: ${parcela.rotulo}`,
          valorCentavos: partes[idx],
        });
      }
    }

    return { criados: pedido.itens.length, motivo: "ok" as const };
  });
}
