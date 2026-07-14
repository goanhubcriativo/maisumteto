import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { valorApostaCentavos, config } from "@/lib/config";
import {
  cpfValido,
  whatsappValido,
  emailValido,
  placarValido,
  somenteDigitos,
} from "@/lib/validacao";
import {
  criarCustomer,
  criarCobrancaPix,
  obterQrCodePix,
} from "@/lib/asaas";

export const runtime = "nodejs";

function vencimentoDaqui(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

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
  if (palpites.length < 1)
    return NextResponse.json(
      { erro: "Adicione pelo menos um palpite à sua casinha." },
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
    // 2) Cliente no Asaas
    const customerId = await criarCustomer({ nome, cpf, whatsapp, email });

    // 3) Cobrança PIX (valor total da casinha)
    const partes = [`${palpites.length} fezinha(s)`];
    if (doacaoCentavos > 0) partes.push("ajudinha extra");
    const descricao = `${config.nomeEvento} · ${partes.join(" + ")} (${nome})`;

    const cobranca = await criarCobrancaPix({
      customerId,
      valorCentavos: valorTotal,
      descricao,
      externalReference: casinha.id,
      vencimento: vencimentoDaqui(3),
    });

    // 4) QR Code
    const qr = await obterQrCodePix(cobranca.paymentId);

    const atualizada = await prisma.casinha.update({
      where: { id: casinha.id },
      data: {
        asaasCustomerId: customerId,
        asaasPaymentId: cobranca.paymentId,
        pixPayload: qr.payload,
        pixQrCodeImage: qr.encodedImage,
        pixExpiraEm: qr.expirationDate ? new Date(qr.expirationDate) : null,
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
