// Lançamento manual: o dinheiro que entrou fora do site.
//
// A rifa vendida na porta do mercado, a camisa paga em dinheiro, o PIX que caiu
// direto na conta de alguém da equipe. Boa parte do que uma equipe arrecada
// nunca passa pelo site, e enquanto isso não entrava aqui o extrato mostrava só
// a parte que passou. Um extrato que conta metade do dinheiro é pior do que
// extrato nenhum, porque parece completo.
//
// A entrada é a MESMA de quem paga pelo site: vira um Pedido com Itens e vira
// Lançamento pelo caminho de sempre (registrarPedidoPago). Só três coisas
// mudam: nasce PAGO, não tem taxa de gateway, e fica marcado como manual com o
// nome de quem registrou. Ter dois caminhos de entrada de dinheiro seria ter
// duas contabilidades para conferir uma com a outra.

import { prisma } from "./db";
import { buscarAcao } from "./repositorio";
import { numerosOcupados, reservarNumeros } from "./rifa";
import { registrarPedidoPago } from "./lancamentos";

export interface NovoLancamentoManual {
  acaoId: string;
  /** O nome oficial de quem contribuiu, como vai aparecer no extrato. */
  nome: string;
  whatsapp?: string;
  cpf?: string;
  anonimo: boolean;
  /** Quantas unidades. Na rifa, quem manda são os números. */
  quantidade: number;
  /** Só para ação de valor livre (doação). Em centavos. */
  valorCentavos?: number | null;
  /** Os números vendidos, quando a ação é rifa. */
  numeros?: number[];
  /** Como o dinheiro chegou: "Dinheiro", "PIX direto", "Transferência". */
  forma: string;
  /** Quando a pessoa pagou de verdade, que não é quando alguém digitou. */
  data: Date;
  registradoPorId: string;
}

type Resultado = { ok: true; pedidoId: string } | { ok: false; erro: string };

const MINIMO_CENTAVOS = 100;
const LIMITE_POR_PEDIDO = 200; // maior que o do site: aqui é a equipe, com o caderno na mão

/** "3, 12, 40" -> [3, 12, 40]. Repetido some, lixo some. */
export function lerNumeros(texto: string, ate: number): number[] {
  return [
    ...new Set(
      String(texto)
        .split(/[^\d]+/)
        .map((n) => Number(n))
        .filter((n) => Number.isFinite(n) && n >= 1 && n <= ate)
    ),
  ].sort((a, b) => a - b);
}

export async function registrarLancamentoManual(
  novo: NovoLancamentoManual
): Promise<Resultado> {
  const nome = novo.nome.trim();
  if (nome.length < 3) {
    return { ok: false, erro: "Escreva o nome completo de quem contribuiu." };
  }

  const acao = await buscarAcao(novo.acaoId);
  if (!acao) return { ok: false, erro: "Ação não encontrada." };
  if (acao.rascunho) {
    return {
      ok: false,
      erro: "Esta ação ainda é rascunho. Publique antes de lançar dinheiro nela.",
    };
  }

  // Ação encerrada ou esgotada CONTINUA aceitando lançamento manual, de
  // propósito: a venda aconteceu enquanto ela estava aberta, e quem digita
  // costuma fazer isso depois, com o caderno na mão. Recusar aqui empurraria o
  // dinheiro para fora do sistema, que é o problema que este arquivo resolve.

  const ehRifa = acao.tipo === "RIFA" && (acao.estoqueTotal ?? 0) > 0;
  const numeros = ehRifa ? (novo.numeros ?? []) : [];

  let quantos: number;
  let valorItens: number;

  if (ehRifa) {
    if (numeros.length === 0) {
      return { ok: false, erro: "Diga quais números foram vendidos." };
    }
    const jaLevados = await numerosOcupados(acao.id);
    const conflito = numeros.filter((n) => jaLevados.includes(n));
    if (conflito.length > 0) {
      return {
        ok: false,
        erro:
          conflito.length === 1
            ? `O número ${conflito[0]} já está com outra pessoa.`
            : `Os números ${conflito.join(", ")} já estão com outras pessoas.`,
      };
    }
    quantos = numeros.length;
    valorItens = (acao.precoCentavos ?? 0) * quantos;
  } else if (acao.precoCentavos == null) {
    // Valor livre: quem digita informa quanto entrou.
    quantos = 1;
    valorItens = Math.floor(Number(novo.valorCentavos ?? 0));
    if (!Number.isFinite(valorItens) || valorItens < MINIMO_CENTAVOS) {
      return { ok: false, erro: "Valor mínimo de R$ 1,00." };
    }
  } else {
    quantos = Math.floor(novo.quantidade);
    if (!Number.isFinite(quantos) || quantos < 1) {
      return { ok: false, erro: "Quantidade inválida." };
    }
    if (quantos > LIMITE_POR_PEDIDO) {
      return { ok: false, erro: `Máximo de ${LIMITE_POR_PEDIDO} por lançamento.` };
    }
    valorItens = acao.precoCentavos * quantos;
  }

  // Estoque: vale igual para quem vende na rua. Passar do estoque aqui faria a
  // página anunciar mais unidades do que existem.
  if (acao.restante !== null && quantos > acao.restante) {
    return {
      ok: false,
      erro:
        acao.restante === 0
          ? "Não resta nenhuma unidade desta ação."
          : `Restam apenas ${acao.restante}.`,
    };
  }

  const pedido = await prisma.pedido.create({
    data: {
      campanhaId: acao.campanhaId,
      nome,
      whatsapp: (novo.whatsapp ?? "").replace(/\D/g, ""),
      cpf: (novo.cpf ?? "").replace(/\D/g, "") || null,
      anonimo: novo.anonimo,
      valorBrutoCentavos: valorItens,
      // Dinheiro na mão não paga taxa de gateway: o líquido é o bruto, e dizer
      // isso explicitamente evita a linha aparecer no extrato como "a confirmar"
      // esperando um webhook que nunca vem.
      taxaCentavos: 0,
      liquidoCentavos: valorItens,
      status: "PAGO",
      paidAt: novo.data,
      manual: true,
      formaManual: novo.forma.trim() || "Dinheiro",
      registradoPorId: novo.registradoPorId,
      itens: {
        create: {
          acaoId: acao.id,
          quantidade: quantos,
          valorUnitarioCentavos: acao.precoCentavos ?? valorItens,
          custoUnitarioCentavos: acao.custoUnitarioCentavos,
          dados: (ehRifa ? { numeros } : {}) as never,
        },
      },
    },
  });

  if (ehRifa) {
    const perdidos = await reservarNumeros(acao.id, pedido.id, numeros);
    if (perdidos.length > 0) {
      // Desfaz: melhor recusar o lançamento do que vender o mesmo número duas
      // vezes e descobrir no dia do sorteio.
      await prisma.pedido.delete({ where: { id: pedido.id } });
      return {
        ok: false,
        erro:
          perdidos.length === 1
            ? `O número ${perdidos[0]} já está com outra pessoa.`
            : `Os números ${perdidos.join(", ")} já estão com outras pessoas.`,
      };
    }
  }

  // O mesmo caminho do PIX pago: receita por item, custo por item, taxa zero.
  await registrarPedidoPago(pedido.id, { liquidoCentavos: valorItens });

  return { ok: true, pedidoId: pedido.id };
}
