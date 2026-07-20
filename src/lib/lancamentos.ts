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

    // O chorinho nao pertence a nenhuma acao: e doacao pura pra campanha.
    if (pedido.doacaoExtraCentavos > 0) {
      await lancarReceita(db, {
        campanhaId,
        acaoId: null,
        pedidoId,
        descricao: `Doacao extra - ${pedido.nome}`,
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
          acaoId: null,
          rotulo: "Doacao extra",
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
