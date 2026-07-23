// As opções de venda de uma ação.
//
// O lote do ingresso, o tamanho da camisa. Uma ação de evento ou produto pode
// ter várias; cada uma com seu preço e seu estoque. Ação sem opção nenhuma
// continua cobrando pelo preço dela e ponto: as opções são um caminho a mais,
// não uma troca do que já existe.
//
// A regra de estoque é a mesma da ação: só conta pedido PAGO. Reservar vaga
// com PIX pendente deixaria o lote "esgotado" por causa de quem gerou o código
// e nunca pagou.

import { prisma } from "./db";

export interface OpcaoView {
  id: string;
  nome: string;
  precoCentavos: number;
  custoUnitarioCentavos: number;
  estoqueTotal: number | null;
  /** Quantas ainda existem. Nulo = ilimitado. */
  restante: number | null;
  esgotada: boolean;
  ordem: number;
}

/** Quantas unidades de cada opção já foram vendidas (só pedido pago). */
async function vendidasPorOpcao(acaoId: string): Promise<Map<string, number>> {
  const linhas = await prisma.item.groupBy({
    by: ["opcaoId"],
    where: { acaoId, opcaoId: { not: null }, pedido: { status: "PAGO" } },
    _sum: { quantidade: true },
  });
  const mapa = new Map<string, number>();
  for (const l of linhas) if (l.opcaoId) mapa.set(l.opcaoId, l._sum.quantidade ?? 0);
  return mapa;
}

/** As opções de uma ação, já com o quanto resta de cada uma. */
export async function opcoesDaAcao(acaoId: string): Promise<OpcaoView[]> {
  const [linhas, vendidas] = await Promise.all([
    prisma.opcao.findMany({ where: { acaoId }, orderBy: { ordem: "asc" } }),
    vendidasPorOpcao(acaoId),
  ]);

  return linhas.map((o) => {
    const restante =
      o.estoqueTotal == null ? null : Math.max(0, o.estoqueTotal - (vendidas.get(o.id) ?? 0));
    return {
      id: o.id,
      nome: o.nome,
      precoCentavos: o.precoCentavos,
      custoUnitarioCentavos: o.custoUnitarioCentavos,
      estoqueTotal: o.estoqueTotal,
      restante,
      esgotada: restante !== null && restante <= 0,
      ordem: o.ordem,
    };
  });
}

/**
 * As opções de TODAS as ações de uma campanha, de uma vez.
 *
 * Uma consulta só, para a lista de ações (home e painel) não disparar duas
 * consultas por ação. Devolve um mapa acaoId -> opções, já com o restante.
 */
export async function opcoesPorAcaoDaCampanha(
  campanhaId: string
): Promise<Map<string, OpcaoView[]>> {
  const [linhas, vendas] = await Promise.all([
    prisma.opcao.findMany({
      where: { acao: { campanhaId } },
      orderBy: [{ acaoId: "asc" }, { ordem: "asc" }],
    }),
    prisma.item.groupBy({
      by: ["opcaoId"],
      where: { acao: { campanhaId }, opcaoId: { not: null }, pedido: { status: "PAGO" } },
      _sum: { quantidade: true },
    }),
  ]);

  const vendidas = new Map<string, number>();
  for (const v of vendas) if (v.opcaoId) vendidas.set(v.opcaoId, v._sum.quantidade ?? 0);

  const mapa = new Map<string, OpcaoView[]>();
  for (const o of linhas) {
    const restante =
      o.estoqueTotal == null ? null : Math.max(0, o.estoqueTotal - (vendidas.get(o.id) ?? 0));
    const view: OpcaoView = {
      id: o.id,
      nome: o.nome,
      precoCentavos: o.precoCentavos,
      custoUnitarioCentavos: o.custoUnitarioCentavos,
      estoqueTotal: o.estoqueTotal,
      restante,
      esgotada: restante !== null && restante <= 0,
      ordem: o.ordem,
    };
    const lista = mapa.get(o.acaoId) ?? [];
    lista.push(view);
    mapa.set(o.acaoId, lista);
  }
  return mapa;
}

/** Uma opção crua, direto do banco, pra conferir preço e estoque no checkout. */
export function buscarOpcao(id: string) {
  return prisma.opcao.findUnique({ where: { id } });
}

export interface NovaOpcao {
  nome: string;
  precoCentavos: number;
  custoUnitarioCentavos?: number;
  estoqueTotal?: number | null;
}

export async function criarOpcao(acaoId: string, dados: NovaOpcao) {
  const quantas = await prisma.opcao.count({ where: { acaoId } });
  return prisma.opcao.create({
    data: {
      acaoId,
      nome: dados.nome.trim() || "Opção",
      precoCentavos: dados.precoCentavos,
      custoUnitarioCentavos: dados.custoUnitarioCentavos ?? 0,
      estoqueTotal: dados.estoqueTotal ?? null,
      ordem: quantas,
    },
  });
}

export async function salvarOpcao(id: string, dados: NovaOpcao) {
  return prisma.opcao.update({
    where: { id },
    data: {
      nome: dados.nome.trim() || "Opção",
      precoCentavos: dados.precoCentavos,
      custoUnitarioCentavos: dados.custoUnitarioCentavos ?? 0,
      estoqueTotal: dados.estoqueTotal ?? null,
    },
  });
}

/**
 * Deixa as opções da ação iguais à lista que veio da tela, sem perder venda.
 *
 * O que existe e continua na lista é atualizado (preço, custo, estoque). O que
 * é novo entra. O que sumiu da lista só é apagado se NUNCA vendeu: se alguém já
 * comprou aquele tamanho, a opção fica, porque apagar levaria junto o vínculo
 * do que foi vendido e o extrato passaria a mentir.
 */
export async function sincronizarOpcoes(
  acaoId: string,
  lista: {
    nome: string;
    precoCentavos: number;
    custoUnitarioCentavos: number;
    estoqueTotal: number | null;
  }[]
): Promise<{ mantidasComVenda: string[] }> {
  const [atuais, vendidas] = await Promise.all([
    prisma.opcao.findMany({ where: { acaoId }, orderBy: { ordem: "asc" } }),
    vendidasPorOpcao(acaoId),
  ]);

  const sobrando = new Map(atuais.map((o) => [o.nome, o]));

  for (const [i, nova] of lista.entries()) {
    const existente = sobrando.get(nova.nome);
    if (existente) {
      await prisma.opcao.update({
        where: { id: existente.id },
        data: {
          precoCentavos: nova.precoCentavos,
          custoUnitarioCentavos: nova.custoUnitarioCentavos,
          estoqueTotal: nova.estoqueTotal,
          ordem: i,
        },
      });
      sobrando.delete(nova.nome);
    } else {
      await prisma.opcao.create({
        data: {
          acaoId,
          nome: nova.nome.trim() || "Opção",
          precoCentavos: nova.precoCentavos,
          custoUnitarioCentavos: nova.custoUnitarioCentavos,
          estoqueTotal: nova.estoqueTotal,
          ordem: i,
        },
      });
    }
  }

  const mantidasComVenda: string[] = [];
  for (const [nome, o] of sobrando) {
    if ((vendidas.get(o.id) ?? 0) > 0) {
      mantidasComVenda.push(nome);
      continue;
    }
    await prisma.opcao.delete({ where: { id: o.id } });
  }

  return { mantidasComVenda };
}

/**
 * Apaga uma opção. Os itens já vendidos por ela não somem: opcaoId vira nulo
 * (onDelete: SetNull) e o nome vendido continua guardado no Item.dados, então o
 * extrato não perde o histórico do que foi vendido antes de a opção sair.
 */
export async function removerOpcao(acaoId: string, id: string) {
  await prisma.opcao.delete({ where: { id } });
  const resto = await prisma.opcao.findMany({
    where: { acaoId },
    orderBy: { ordem: "asc" },
    select: { id: true },
  });
  await prisma.$transaction(
    resto.map((o, i) => prisma.opcao.update({ where: { id: o.id }, data: { ordem: i } }))
  );
}
