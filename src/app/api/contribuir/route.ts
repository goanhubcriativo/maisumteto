// Cria um Pedido e devolve o PIX pra pagar.
//
// É o único caminho de entrada de dinheiro na plataforma. Toda ação passa por
// aqui: doação, rifa, camisa, ingresso. O que muda entre elas é o Item, nunca o
// caminho.
//
// A regra que sustenta a segurança desta rota: o preço NUNCA vem do navegador.
// O corpo diz "quero 3 unidades da ação X"; o preço, o estoque e a validade
// saem do banco. Se o preço viesse de fora, bastaria um F12 para comprar uma
// rifa de R$ 20 por R$ 0,01.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { numerosOcupados, reservarNumeros } from "@/lib/rifa";
import { criarPagamentoPix, expiracaoISO } from "@/lib/mercadopago";
import { buscarAcao } from "@/lib/repositorio";

export const runtime = "nodejs";

/** Só dígitos, do jeito que o Mercado Pago espera. */
function soDigitos(texto: string): string {
  return (texto || "").replace(/\D/g, "");
}

/** CPF válido pelos dois dígitos verificadores. */
function cpfValido(cpf: string): boolean {
  const n = soDigitos(cpf);
  if (n.length !== 11 || /^(\d)\1{10}$/.test(n)) return false;

  const digito = (ate: number) => {
    let soma = 0;
    for (let i = 0; i < ate; i++) soma += Number(n[i]) * (ate + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return digito(9) === Number(n[9]) && digito(10) === Number(n[10]);
}

const LIMITE_POR_PEDIDO = 50; // trava contra pedido absurdo por engano ou má-fé
const MINIMO_CENTAVOS = 100; // R$ 1: abaixo disso a taxa come tudo

export async function POST(req: NextRequest) {
  let corpo: Record<string, unknown>;
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ erro: "Requisição inválida." }, { status: 400 });
  }

  const acaoId = String(corpo.acaoId ?? "");
  const nome = String(corpo.nome ?? "").trim();
  const whatsapp = soDigitos(String(corpo.whatsapp ?? ""));
  const cpf = soDigitos(String(corpo.cpf ?? ""));
  const email = String(corpo.email ?? "").trim() || null;
  const anonimo = corpo.anonimo === true;
  const quantidade = Math.floor(Number(corpo.quantidade ?? 1));
  const valorLivre = Number(corpo.valorCentavos ?? 0);
  // O "chorinho": um valor extra que a pessoa soma por cima da rifa, da camisa,
  // do palpite. Vem separado dos itens de proposito, porque nao pertence a
  // nenhuma unidade: e doacao pura pendurada no mesmo PIX. So existe fora da
  // doacao livre, onde somar "um extra" ao valor livre nao faria sentido.
  const doacaoExtra = Math.max(0, Math.floor(Number(corpo.doacaoExtraCentavos ?? 0)));
  const dados = (corpo.dados ?? {}) as Record<string, unknown>;

  if (nome.length < 3) {
    return NextResponse.json({ erro: "Escreva seu nome completo." }, { status: 400 });
  }
  if (whatsapp.length < 10 || whatsapp.length > 11) {
    return NextResponse.json({ erro: "WhatsApp com DDD, só números." }, { status: 400 });
  }
  // O Mercado Pago exige CPF do pagador para gerar PIX.
  if (!cpfValido(cpf)) {
    return NextResponse.json({ erro: "CPF inválido." }, { status: 400 });
  }

  const acao = await buscarAcao(acaoId);
  if (!acao || acao.rascunho) {
    return NextResponse.json({ erro: "Ação não encontrada." }, { status: 404 });
  }
  if (!acao.disponivel) {
    return NextResponse.json(
      { erro: "Esta ação não está aberta para contribuições." },
      { status: 409 }
    );
  }

  // Preço e quantidade saem do banco, nunca do corpo da requisição.
  const precoUnitario = acao.precoCentavos;
  let valorItens: number;
  let quantos: number;

  if (precoUnitario == null) {
    // Valor livre (doação): a pessoa escolhe quanto, mas dentro de limites.
    quantos = 1;
    valorItens = Math.floor(valorLivre);
    if (!Number.isFinite(valorItens) || valorItens < MINIMO_CENTAVOS) {
      return NextResponse.json({ erro: "Valor mínimo de R$ 1,00." }, { status: 400 });
    }
    if (valorItens > 5_000_000) {
      return NextResponse.json(
        { erro: "Para valores acima de R$ 50.000, fale com a equipe." },
        { status: 400 }
      );
    }
  } else {
    quantos = Number.isFinite(quantidade) && quantidade > 0 ? quantidade : 1;
    if (quantos > LIMITE_POR_PEDIDO) {
      return NextResponse.json(
        { erro: `Máximo de ${LIMITE_POR_PEDIDO} por pedido.` },
        { status: 400 }
      );
    }
    // Estoque: quem chegou depois do último não pode passar na frente.
    if (acao.restante !== null && quantos > acao.restante) {
      return NextResponse.json(
        {
          erro:
            acao.restante === 0
              ? "Acabou o estoque desta ação."
              : `Restam apenas ${acao.restante}.`,
        },
        { status: 409 }
      );
    }
    valorItens = precoUnitario * quantos;
  }

  // Rifa: os numeros escolhidos mandam na quantidade e no preco.
  //
  // Nunca confiar na quantidade que o navegador enviou: quem escolheu tres
  // numeros paga tres, e nao o que o corpo da requisicao disser.
  const ehRifa = acao.tipo === "RIFA" && (acao.estoqueTotal ?? 0) > 0;
  let numerosEscolhidos: number[] = [];

  if (ehRifa) {
    const crus = Array.isArray(dados.numeros) ? dados.numeros : [];
    numerosEscolhidos = [
      ...new Set(
        crus
          .map((n) => Math.floor(Number(n)))
          .filter((n) => Number.isFinite(n) && n >= 1 && n <= (acao.estoqueTotal ?? 0))
      ),
    ];

    if (numerosEscolhidos.length === 0) {
      return NextResponse.json({ erro: "Escolha pelo menos um número." }, { status: 400 });
    }
    if (acao.limitePorPedido && numerosEscolhidos.length > acao.limitePorPedido) {
      return NextResponse.json(
        { erro: `Máximo de ${acao.limitePorPedido} números por pedido.` },
        { status: 400 }
      );
    }

    const jaLevados = await numerosOcupados(acao.id);
    const conflito = numerosEscolhidos.filter((n) => jaLevados.includes(n));
    if (conflito.length > 0) {
      return NextResponse.json(
        {
          erro:
            conflito.length === 1
              ? `O número ${conflito[0]} acabou de ser levado. Escolha outro.`
              : `Os números ${conflito.join(", ")} acabaram de ser levados. Escolha outros.`,
        },
        { status: 409 }
      );
    }

    quantos = numerosEscolhidos.length;
    valorItens = (precoUnitario ?? 0) * quantos;
  }

  // O chorinho só vale fora da doação livre: lá o valor já é livre, somar um
  // "extra" seria pedir duas vezes a mesma coisa. Teto de R$ 50 mil, o mesmo da
  // doação, pra um dígito a mais não virar uma cobrança absurda.
  const extra = precoUnitario == null ? 0 : Math.min(doacaoExtra, 5_000_000);
  const totalCentavos = valorItens + extra;

  const pedido = await prisma.pedido.create({
    data: {
      campanhaId: acao.campanhaId,
      nome,
      whatsapp,
      cpf,
      email,
      anonimo,
      valorBrutoCentavos: totalCentavos,
      doacaoExtraCentavos: extra,
      status: "PENDENTE",
      itens: {
        create: {
          acaoId: acao.id,
          quantidade: quantos,
          valorUnitarioCentavos: precoUnitario ?? valorItens,
          // O custo é congelado no momento da venda: se a equipe mudar o custo
          // depois, o que já foi vendido continua com o custo que valia.
          custoUnitarioCentavos: acao.custoUnitarioCentavos,
          dados: dados as never,
        },
      },
    },
  });

  // A reserva vem DEPOIS do pedido porque ela aponta pra ele. Se algum numero
  // escapou entre a conferencia e agora, o banco recusa e o pedido e desfeito:
  // melhor mandar a pessoa escolher outro do que vender o mesmo numero duas
  // vezes e descobrir no dia do sorteio.
  if (ehRifa) {
    const perdidos = await reservarNumeros(acao.id, pedido.id, numerosEscolhidos);
    if (perdidos.length > 0) {
      await prisma.pedido.delete({ where: { id: pedido.id } });
      return NextResponse.json(
        {
          erro:
            perdidos.length === 1
              ? `O número ${perdidos[0]} acabou de ser levado. Escolha outro.`
              : `Os números ${perdidos.join(", ")} acabaram de ser levados. Escolha outros.`,
        },
        { status: 409 }
      );
    }
  }


  try {
    const pix = await criarPagamentoPix({
      nome,
      cpf,
      email: email ?? undefined,
      valorCentavos: totalCentavos,
      descricao: `${acao.titulo} · Casa Amiga`,
      externalReference: pedido.id,
      expiraEmISO: expiracaoISO(24),
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

    return NextResponse.json({ pedidoId: pedido.id });
  } catch (e) {
    // O PIX não nasceu: o pedido vira CANCELADO em vez de ficar pendente para
    // sempre, senão a lista de pendentes encheria de pedido que nunca existiu.
    await prisma.pedido.update({
      where: { id: pedido.id },
      data: { status: "CANCELADO" },
    });
    const msg = e instanceof Error ? e.message : "Não consegui gerar o PIX.";
    return NextResponse.json({ erro: msg }, { status: 502 });
  }
}
