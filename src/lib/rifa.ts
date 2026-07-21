// Reserva de números da rifa.
//
// A regra que sustenta tudo é a chave única (acaoId, numero) no banco. Conferir
// disponibilidade em memória e depois gravar não resolve: duas pessoas clicando
// no mesmo número ao mesmo tempo passam as duas pela conferência. Aqui a
// conferência serve só para dar um aviso decente; quem realmente decide é o
// banco, ao recusar a segunda gravação.

import { prisma } from "./db";

/** Reserva vencida: PIX expirou sem pagamento, ou o pedido foi cancelado. */
function reservaMorta(pedido: { status: string; pixExpiraEm: Date | null }): boolean {
  if (pedido.status === "PAGO") return false;
  if (pedido.status === "CANCELADO") return true;
  // Pendente: vale enquanto o PIX valer. Sem data de expiração, segura.
  return pedido.pixExpiraEm ? pedido.pixExpiraEm.getTime() < Date.now() : false;
}

/**
 * Os números que não estão mais disponíveis.
 *
 * Inclui os pagos e os reservados por um PIX ainda válido. Quem gerou o PIX
 * segura o número enquanto ele vale: sem isso, a pessoa escolheria o 7, abriria
 * o aplicativo do banco e perderia o número no caminho.
 */
export async function numerosOcupados(acaoId: string): Promise<number[]> {
  const reservas = await prisma.numeroRifa.findMany({
    where: { acaoId },
    select: {
      numero: true,
      pedido: { select: { status: true, pixExpiraEm: true } },
    },
  });

  return reservas.filter((r) => !reservaMorta(r.pedido)).map((r) => r.numero);
}

/**
 * Prende os números escolhidos a um pedido.
 *
 * Antes de gravar, apaga reservas vencidas desses mesmos números: sem isso, um
 * PIX abandonado deixaria o número travado para sempre por causa da chave
 * única.
 *
 * Devolve os números que outra pessoa levou primeiro. Lista vazia = deu certo.
 */
export async function reservarNumeros(
  acaoId: string,
  pedidoId: string,
  numeros: number[]
): Promise<number[]> {
  const existentes = await prisma.numeroRifa.findMany({
    where: { acaoId, numero: { in: numeros } },
    select: {
      id: true,
      numero: true,
      pedido: { select: { status: true, pixExpiraEm: true } },
    },
  });

  const mortas = existentes.filter((r) => reservaMorta(r.pedido));
  if (mortas.length > 0) {
    await prisma.numeroRifa.deleteMany({ where: { id: { in: mortas.map((m) => m.id) } } });
  }

  const perdidos: number[] = [];

  for (const numero of numeros) {
    try {
      await prisma.numeroRifa.create({ data: { acaoId, pedidoId, numero } });
    } catch {
      // Só cai aqui por violação da chave única, que é exatamente o caso de
      // alguém ter levado o número entre a conferência e a gravação.
      perdidos.push(numero);
    }
  }

  return perdidos;
}

/** Os números de um pedido, para mostrar na tela de pagamento e no recibo. */
export async function numerosDoPedido(pedidoId: string): Promise<number[]> {
  const r = await prisma.numeroRifa.findMany({
    where: { pedidoId },
    orderBy: { numero: "asc" },
    select: { numero: true },
  });
  return r.map((x) => x.numero);
}
