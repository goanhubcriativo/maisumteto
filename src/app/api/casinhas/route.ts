import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/bolao/db";
import { valorApostaCentavos, config, bolaoEncerrado } from "@/lib/bolao/config";
import {
  cpfValido,
  whatsappValido,
  emailValido,
  placarValido,
  somenteDigitos,
} from "@/lib/bolao/validacao";
import { criarPagamentoPix, expiracaoISO } from "@/lib/bolao/mercadopago";

export const runtime = "nodejs";

interface PalpiteBody {
  placarCasa: number;
  placarVisitante: number;
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });
  }

  // Bolão fechado após o prazo (1 min antes do jogo).
  if (bolaoEncerrado())
    return NextResponse.json(
      {
        erro: "O bolão encerrou (palpites só até domingo, 15h59). Muito obrigado por participar!",
      },
      { status: 400 }
    );

  const nome = String(body.nome || "").trim();
  const whatsapp = somenteDigitos(String(body.whatsapp || ""));
  const cpf = somenteDigitos(String(body.cpf || ""));
  const email = String(body.email || "").trim();
  const doacaoCentavos = Math.max(0, Math.round(Number(body.doacaoCentavos) || 0));

  // Palpites
  const palpitesRaw: any[] = Array.isArray(body.palpites) ? body.palpites : [];
  const palpites: PalpiteBody[] = palpitesRaw.map((p) => ({
    placarCasa: Number(p?.placarCasa),
    placarVisitante: Number(p?.placarVisitante),
  }));

  // Validações
  if (nome.length < 3)
    return NextResponse.json({ erro: "Informe seu nome completo." }, { status: 400 });
  if (!whatsappValido(whatsapp))
    return NextResponse.json({ erro: "WhatsApp inválido (com DDD)." }, { status: 400 });
  if (!cpfValido(cpf))
    return NextResponse.json({ erro: "CPF inválido." }, { status: 400 });
  if (!emailValido(email))
    return NextResponse.json({ erro: "E-mail inválido." }, { status: 400 });
  if (palpites.length < 1 && doacaoCentavos <= 0)
    return NextResponse.json(
      { erro: "Adicione pelo menos um palpite ou uma ajudinha extra à sua casinha." },
      { status: 400 }
    );
  if (palpites.length > 100)
    return NextResponse.json(
      { erro: "Muitos palpites de uma vez (máx. 100)." },
      { status: 400 }
    );
  for (const p of palpites) {
    if (!placarValido(p.placarCasa) || !placarValido(p.placarVisitante))
      return NextResponse.json(
        { erro: "Há um palpite com placar inválido." },
        { status: 400 }
      );
  }
  if (doacaoCentavos > 5_000_000)
    return NextResponse.json({ erro: "Valor de doação muito alto." }, { status: 400 });

  const precoUnit = valorApostaCentavos();
  const valorPalpites = palpites.length * precoUnit;
  const valorTotal = valorPalpites + doacaoCentavos;

  // Asaas exige um mínimo de R$ 5,00 por cobrança PIX.
  if (valorTotal < 500)
    return NextResponse.json(
      { erro: "O PIX tem um mínimo de R$ 5,00. Some mais fézinhas ou uma ajudinha extra." },
      { status: 400 }
    );

  // 1) Cria a casinha (PENDENTE) com os palpites
  const casinha = await prisma.casinha.create({
    data: {
      nome,
      whatsapp,
      cpf,
      email: email || null,
      doacaoCentavos,
      valorTotalCentavos: valorTotal,
      status: "PENDENTE",
      palpites: {
        create: palpites.map((p) => ({
          placarCasa: p.placarCasa,
          placarVisitante: p.placarVisitante,
        })),
      },
    },
  });

  try {
    // Descrição da cobrança
    const partes: string[] = [];
    if (palpites.length > 0) partes.push(`${palpites.length} fezinha(s)`);
    if (doacaoCentavos > 0) partes.push("ajudinha extra");
    const descricao = `${config.nomeEvento} · ${partes.join(" + ")} (${nome})`;

    const origin = req.nextUrl?.origin || "https://maisumteto.com.br";

    // Cobrança PIX no Mercado Pago (uma chamada já devolve o QR)
    const pix = await criarPagamentoPix({
      nome,
      cpf,
      email: email || undefined,
      valorCentavos: valorTotal,
      descricao,
      externalReference: casinha.id,
      expiraEmISO: expiracaoISO(72),
      notificationUrl: `${origin}/api/webhook/mercadopago`,
    });

    const atualizada = await prisma.casinha.update({
      where: { id: casinha.id },
      data: {
        // reaproveitamos a coluna asaasPaymentId pro id do pagamento no MP
        asaasPaymentId: pix.paymentId,
        pixPayload: pix.pixPayload,
        pixQrCodeImage: pix.pixQrCodeImage,
        pixExpiraEm: pix.expiraEm ? new Date(pix.expiraEm) : null,
      },
    });

    return NextResponse.json({
      id: atualizada.id,
      status: atualizada.status,
      pixPayload: atualizada.pixPayload,
      pixQrCodeImage: atualizada.pixQrCodeImage,
      valorTotalCentavos: atualizada.valorTotalCentavos,
    });
  } catch (e: any) {
    await prisma.casinha
      .update({ where: { id: casinha.id }, data: { status: "CANCELADO" } })
      .catch(() => {});
    return NextResponse.json(
      { erro: e?.message || "Falha ao gerar a cobrança PIX." },
      { status: 502 }
    );
  }
}
